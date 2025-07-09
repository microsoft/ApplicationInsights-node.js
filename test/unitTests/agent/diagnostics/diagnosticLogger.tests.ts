// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from "assert";
import sinon from "sinon";
import * as fs from "fs";
import * as path from "path";
import { DiagnosticLogger } from "../../../../src/agent/diagnostics/diagnosticLogger";
import { EtwDiagnosticLogger } from "../../../../src/agent/diagnostics/etwDiagnosticLogger";
import { EtwWriter } from "../../../../src/agent/diagnostics/writers/etwWriter";
import { ConsoleWriter } from "../../../../src/agent/diagnostics/writers/consoleWriter";
import { Util } from "../../../../src/shared/util";

describe("agent/diagnostics/diagnosticLogger", () => {
    let sandbox: sinon.SinonSandbox;
    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });
    it("should console log by default", () => {
        const logger = new DiagnosticLogger("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        const consoleStub = sandbox.stub(console, "log");
        logger.logMessage({ message: "test" });
        assert(consoleStub.calledOnce);
    });
});

describe("agent/diagnostics/etwDiagnosticLogger", () => {
    let sandbox: sinon.SinonSandbox;
    
    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("constructor", () => {
        it("should initialize with correct instrumentationKey", () => {
            const instrumentationKey = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
            
            // Create the logger
            const logger = new EtwDiagnosticLogger(instrumentationKey);
            
            // Verify instrumentationKey is set correctly
            assert.strictEqual((logger as any)._instrumentationKey, instrumentationKey);
            
            // Verify EtwWriter is initialized
            assert.ok((logger as any)._agentLogger instanceof EtwWriter);
        });
    });

    describe("logMessage", () => {
        it("should call EtwWriter.log with message and metadata", () => {
            const instrumentationKey = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
            const messageId = "testMessageId";
            const message = "test message";
            
            // Create a stub for EtwWriter.log
            const logStub = sandbox.stub(EtwWriter.prototype, "log");
            
            // Create the logger
            const logger = new EtwDiagnosticLogger(instrumentationKey);
            
            // Call logMessage
            logger.logMessage({ message, messageId });
            
            // Verify log was called with correct parameters
            assert.strictEqual(logStub.callCount, 1);
            assert.strictEqual(logStub.firstCall.args[0], message);
            
            // Verify metadata array
            const metadataArg = logStub.firstCall.args[1];
            assert.ok(Array.isArray(metadataArg));
            assert.strictEqual(metadataArg.length, 6); // 5 base metadata fields + messageId
            assert.strictEqual(metadataArg[5], messageId); // messageId is pushed last
        });

        it("should handle missing messageId", () => {
            const instrumentationKey = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
            const message = "test message";
            
            // Create a stub for EtwWriter.log
            const logStub = sandbox.stub(EtwWriter.prototype, "log");
            
            // Create the logger
            const logger = new EtwDiagnosticLogger(instrumentationKey);
            
            // Call logMessage without messageId
            logger.logMessage({ message });
            
            // Verify log was called with correct parameters
            assert.strictEqual(logStub.callCount, 1);
            assert.strictEqual(logStub.firstCall.args[0], message);
            
            // Verify metadata array
            const metadataArg = logStub.firstCall.args[1];
            assert.ok(Array.isArray(metadataArg));
            assert.strictEqual(metadataArg.length, 6); // 5 base metadata fields + empty messageId
            assert.strictEqual(metadataArg[5], ""); // Empty string for missing messageId
        });
    });

    describe("_getMetadata", () => {
        it("should return metadata array in correct order", () => {
            const instrumentationKey = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
            
            // Save original environment variables
            const originalEnv = { ...process.env };
            
            // Mock environment variables
            process.env.WEBSITE_SITE_NAME = "testSiteName";
            process.env.ApplicationInsightsAgent_EXTENSION_VERSION = "testExtensionVersion";
            process.env.WEBSITE_OWNER_NAME = "testSubscriptionId+testResourceGroup";
            
            // Create the logger
            const logger = new EtwDiagnosticLogger(instrumentationKey);
            
            // Access private method using type assertion
            const getMetadata = (logger as any)._getMetadata.bind(logger);
            const metadata = getMetadata();
            
            // Verify metadata array structure and order
            assert.strictEqual(metadata.length, 5);
            assert.strictEqual(metadata[0], "testExtensionVersion"); // _extensionVersion
            assert.strictEqual(metadata[1], "testSubscriptionId"); // _subscriptionId
            assert.strictEqual(metadata[2], "testSiteName"); // _siteName
            assert.strictEqual(metadata[3], (logger as any)._sdkVersion); // _sdkVersion
            assert.strictEqual(metadata[4], instrumentationKey); // _instrumentationKey
            
            // Restore environment variables
            process.env = originalEnv;
        });
        
        it("should handle missing environment variables", () => {
            const instrumentationKey = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
            
            // Save original environment variables
            const originalEnv = { ...process.env };
            
            // Clear relevant environment variables
            delete process.env.WEBSITE_SITE_NAME;
            delete process.env.ApplicationInsightsAgent_EXTENSION_VERSION;
            delete process.env.WEBSITE_OWNER_NAME;
            
            // Create the logger
            const logger = new EtwDiagnosticLogger(instrumentationKey);
            
            // Access private method using type assertion
            const getMetadata = (logger as any)._getMetadata.bind(logger);
            const metadata = getMetadata();
            
            // Verify metadata array structure and order
            assert.strictEqual(metadata.length, 5);
            assert.strictEqual(metadata[0], undefined); // _extensionVersion
            assert.strictEqual(metadata[1], null); // _subscriptionId is null when WEBSITE_OWNER_NAME is missing
            assert.strictEqual(metadata[2], undefined); // _siteName
            assert.strictEqual(metadata[3], (logger as any)._sdkVersion); // _sdkVersion
            assert.strictEqual(metadata[4], instrumentationKey); // _instrumentationKey
            
            // Restore environment variables
            process.env = originalEnv;
        });
    });
});

describe("agent/diagnostics/writers/etwWriter", () => {
    let sandbox: sinon.SinonSandbox;
    
    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("constructor", () => {
        it("should initialize without ETW module when fs.accessSync throws", () => {
            // Mock fs.accessSync to throw
            sandbox.stub(fs, "accessSync").throws(new Error("Directory not accessible"));
            
            // Mock console.log
            const consoleLogStub = sandbox.stub(console, "log");
            
            const writer = new EtwWriter();
            
            // Verify ETW module is not loaded
            assert.strictEqual((writer as any)._etwModule, undefined);
            assert.ok(consoleLogStub.calledWith('AppInsightsAgent: ETW could not be loaded'));
        });

        it("should handle errors when loading ETW module", () => {
            // Mock process.versions.node
            const originalNodeVersion = process.versions.node;
            Object.defineProperty(process.versions, 'node', {
                value: '16.0.0',
                configurable: true
            });
            
            // Mock console.log
            const consoleLogStub = sandbox.stub(console, "log");
            
            // Force constructor to throw an error
            sandbox.stub(EtwWriter.prototype as any, "_loadEtwModule").throws(new Error("Test error"));
            
            const writer = new EtwWriter();
            
            // Verify ETW module is not loaded
            assert.strictEqual((writer as any)._etwModule, undefined);
            assert.ok(consoleLogStub.calledWith(sinon.match(/Could not load ETW. Defaulting to console logging/)));
            
            // Restore Node.js version
            Object.defineProperty(process.versions, 'node', {
                value: originalNodeVersion,
                configurable: true
            });
        });
    });

    describe("log", () => {
        it("should call logInfoEvent when ETW module exists", () => {
            // Create a writer with mock ETW module
            const mockEtwModule = {
                logInfoEvent: sandbox.stub()
            };
            
            const writer = new EtwWriter();
            (writer as any)._etwModule = mockEtwModule;
            
            const message = "Test message";
            const optional = ["metadata1", "metadata2"];
            
            writer.log(message, optional);
            
            // Verify logInfoEvent was called with correct parameters
            assert.ok(mockEtwModule.logInfoEvent.calledOnce);
            assert.ok(mockEtwModule.logInfoEvent.calledWith(message, ...optional));
        });

        it("should log to console when ETW module does not exist", () => {
            // Create a writer without ETW module
            const writer = new EtwWriter();
            (writer as any)._etwModule = undefined;
            
            // Mock console.log
            const consoleLogStub = sandbox.stub(console, "log");
            
            // Mock Util.getInstance().stringify
            const stringifyStub = sandbox.stub();
            stringifyStub.returns("stringified message");
            sandbox.stub(Util, "getInstance").returns({ stringify: stringifyStub } as any);
            
            const message = "Test message";
            
            writer.log(message);
            
            // Verify console.log was called with stringified message
            assert.ok(consoleLogStub.calledOnce);
            assert.ok(stringifyStub.calledWith(message));
            assert.ok(consoleLogStub.calledWith("stringified message"));
        });

        it("should handle optional parameters when ETW module does not exist", () => {
            // Create a writer without ETW module
            const writer = new EtwWriter();
            (writer as any)._etwModule = undefined;
            
            // Mock console.log
            const consoleLogStub = sandbox.stub(console, "log");
            
            // Mock Util.getInstance().stringify
            const stringifyStub = sandbox.stub();
            stringifyStub.returns("stringified message");
            sandbox.stub(Util, "getInstance").returns({ stringify: stringifyStub } as any);
            
            const message = "Test message";
            const optional = ["metadata1", "metadata2"];
            
            writer.log(message, optional);
            
            // Verify console.log was called with stringified message
            assert.ok(consoleLogStub.calledOnce);
            assert.ok(stringifyStub.calledWith(message));
            assert.ok(consoleLogStub.calledWith("stringified message"));
        });
    });

    describe("error", () => {
        it("should call logErrEvent when ETW module exists", () => {
            // Create a writer with mock ETW module
            const mockEtwModule = {
                logErrEvent: sandbox.stub()
            };
            
            const writer = new EtwWriter();
            (writer as any)._etwModule = mockEtwModule;
            
            const message = "Error message";
            const optional = ["metadata1", "metadata2"];
            
            writer.error(message, optional);
            
            // Verify logErrEvent was called with correct parameters
            assert.ok(mockEtwModule.logErrEvent.calledOnce);
            assert.ok(mockEtwModule.logErrEvent.calledWith(message, ...optional));
        });

        it("should log to console.error when ETW module does not exist", () => {
            // Create a writer without ETW module
            const writer = new EtwWriter();
            (writer as any)._etwModule = undefined;
            
            // Mock console.error
            const consoleErrorStub = sandbox.stub(console, "error");
            
            // Mock Util.getInstance().stringify
            const stringifyStub = sandbox.stub();
            stringifyStub.returns("stringified error message");
            sandbox.stub(Util, "getInstance").returns({ stringify: stringifyStub } as any);
            
            const message = "Error message";
            
            writer.error(message);
            
            // Verify console.error was called with stringified message
            assert.ok(consoleErrorStub.calledOnce);
            assert.ok(stringifyStub.calledWith(message));
            assert.ok(consoleErrorStub.calledWith("stringified error message"));
        });

        it("should handle optional parameters when ETW module does not exist", () => {
            // Create a writer without ETW module
            const writer = new EtwWriter();
            (writer as any)._etwModule = undefined;
            
            // Mock console.error
            const consoleErrorStub = sandbox.stub(console, "error");
            
            // Mock Util.getInstance().stringify
            const stringifyStub = sandbox.stub();
            stringifyStub.returns("stringified error message");
            sandbox.stub(Util, "getInstance").returns({ stringify: stringifyStub } as any);
            
            const message = "Error message";
            const optional = ["metadata1", "metadata2"];
            
            writer.error(message, optional);
            
            // Verify console.error was called with stringified message
            assert.ok(consoleErrorStub.calledOnce);
            assert.ok(stringifyStub.calledWith(message));
            assert.ok(consoleErrorStub.calledWith("stringified error message"));
        });
    });

    describe("_loadEtwModule", () => {
        it("should return undefined when directory is not accessible", () => {
            // Mock fs.accessSync to throw
            sandbox.stub(fs, "accessSync").throws(new Error("Directory not accessible"));
            
            const writer = new EtwWriter();
            const result = (writer as any)._loadEtwModule(16); // Using Node.js v16
            
            assert.strictEqual(result, undefined);
        });

        it("should handle require throwing an error", () => {
            // Mock path.join
            const mockPath = "/mock/path/to/etw/etw_16";
            sandbox.stub(path, "join").returns(mockPath);
            
            // Mock fs.accessSync to not throw
            sandbox.stub(fs, "accessSync").returns(undefined);
            
            // Mock require to throw
            const requireStub = sandbox.stub().throws(new Error("Module loading error"));
            const originalRequire = require;
            (global as any).require = requireStub;
            
            const writer = new EtwWriter();
            const result = (writer as any)._loadEtwModule(16); // Using Node.js v16
            
            // Verify result is undefined
            assert.strictEqual(result, undefined);
            
            // Restore require
            (global as any).require = originalRequire;
        });
    });
});

describe("agent/diagnostics/writers/consoleWriter", () => {
    let sandbox: sinon.SinonSandbox;
    
    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("log", () => {
        it("should call console.log with stringified message", () => {
            // Mock console.log
            const consoleLogStub = sandbox.stub(console, "log");
            
            // Mock Util.getInstance().stringify
            const stringifyStub = sandbox.stub();
            stringifyStub.returns("stringified message");
            sandbox.stub(Util, "getInstance").returns({ stringify: stringifyStub } as any);
            
            // Create a ConsoleWriter instance
            const writer = new ConsoleWriter();
            
            // Call log with various types of messages
            writer.log("string message");
            writer.log({ key: "object message" });
            writer.log(123);
            writer.log(null);
            writer.log(undefined);
            
            // Verify console.log was called with stringified message for each call
            assert.strictEqual(consoleLogStub.callCount, 5);
            assert.strictEqual(stringifyStub.callCount, 5);
            assert.ok(stringifyStub.calledWith("string message"));
            assert.ok(stringifyStub.calledWith({ key: "object message" }));
            assert.ok(stringifyStub.calledWith(123));
            assert.ok(stringifyStub.calledWith(null));
            assert.ok(stringifyStub.calledWith(undefined));
            assert.ok(consoleLogStub.alwaysCalledWith("stringified message"));
        });

        it("should handle optional parameters", () => {
            // Mock console.log
            const consoleLogStub = sandbox.stub(console, "log");
            
            // Mock Util.getInstance().stringify
            const stringifyStub = sandbox.stub();
            stringifyStub.returns("stringified message");
            sandbox.stub(Util, "getInstance").returns({ stringify: stringifyStub } as any);
            
            // Create a ConsoleWriter instance
            const writer = new ConsoleWriter();
            
            // Call log with optional parameters
            writer.log("message", "param1", "param2", { param: 3 });
            
            // Verify console.log was called with stringified message
            assert.strictEqual(consoleLogStub.callCount, 1);
            assert.strictEqual(stringifyStub.callCount, 1);
            assert.ok(stringifyStub.calledWith("message"));
            assert.ok(consoleLogStub.calledWith("stringified message"));
        });

        it("should handle message being undefined", () => {
            // Mock console.log
            const consoleLogStub = sandbox.stub(console, "log");
            
            // Mock Util.getInstance().stringify
            const stringifyStub = sandbox.stub();
            stringifyStub.returns("stringified undefined");
            sandbox.stub(Util, "getInstance").returns({ stringify: stringifyStub } as any);
            
            // Create a ConsoleWriter instance
            const writer = new ConsoleWriter();
            
            // Call log without a message
            writer.log();
            
            // Verify console.log was called with stringified undefined
            assert.strictEqual(consoleLogStub.callCount, 1);
            assert.strictEqual(stringifyStub.callCount, 1);
            assert.ok(stringifyStub.calledWith(undefined));
            assert.ok(consoleLogStub.calledWith("stringified undefined"));
        });
    });

    describe("error", () => {
        it("should call console.error with stringified message", () => {
            // Mock console.error
            const consoleErrorStub = sandbox.stub(console, "error");
            
            // Mock Util.getInstance().stringify
            const stringifyStub = sandbox.stub();
            stringifyStub.returns("stringified error message");
            sandbox.stub(Util, "getInstance").returns({ stringify: stringifyStub } as any);
            
            // Create a ConsoleWriter instance
            const writer = new ConsoleWriter();
            
            // Call error with various types of messages
            writer.error("string error");
            writer.error({ key: "object error" });
            writer.error(456);
            writer.error(null);
            writer.error(undefined);
            
            // Verify console.error was called with stringified message for each call
            assert.strictEqual(consoleErrorStub.callCount, 5);
            assert.strictEqual(stringifyStub.callCount, 5);
            assert.ok(stringifyStub.calledWith("string error"));
            assert.ok(stringifyStub.calledWith({ key: "object error" }));
            assert.ok(stringifyStub.calledWith(456));
            assert.ok(stringifyStub.calledWith(null));
            assert.ok(stringifyStub.calledWith(undefined));
            assert.ok(consoleErrorStub.alwaysCalledWith("stringified error message"));
        });

        it("should handle optional parameters", () => {
            // Mock console.error
            const consoleErrorStub = sandbox.stub(console, "error");
            
            // Mock Util.getInstance().stringify
            const stringifyStub = sandbox.stub();
            stringifyStub.returns("stringified error message");
            sandbox.stub(Util, "getInstance").returns({ stringify: stringifyStub } as any);
            
            // Create a ConsoleWriter instance
            const writer = new ConsoleWriter();
            
            // Call error with optional parameters
            writer.error("error message", "param1", "param2", { param: 3 });
            
            // Verify console.error was called with stringified message
            assert.strictEqual(consoleErrorStub.callCount, 1);
            assert.strictEqual(stringifyStub.callCount, 1);
            assert.ok(stringifyStub.calledWith("error message"));
            assert.ok(consoleErrorStub.calledWith("stringified error message"));
        });

        it("should handle message being undefined", () => {
            // Mock console.error
            const consoleErrorStub = sandbox.stub(console, "error");
            
            // Mock Util.getInstance().stringify
            const stringifyStub = sandbox.stub();
            stringifyStub.returns("stringified undefined");
            sandbox.stub(Util, "getInstance").returns({ stringify: stringifyStub } as any);
            
            // Create a ConsoleWriter instance
            const writer = new ConsoleWriter();
            
            // Call error without a message
            writer.error();
            
            // Verify console.error was called with stringified undefined
            assert.strictEqual(consoleErrorStub.callCount, 1);
            assert.strictEqual(stringifyStub.callCount, 1);
            assert.ok(stringifyStub.calledWith(undefined));
            assert.ok(consoleErrorStub.calledWith("stringified undefined"));
        });
    });
});
