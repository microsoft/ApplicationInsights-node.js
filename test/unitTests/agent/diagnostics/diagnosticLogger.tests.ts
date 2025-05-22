// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as assert from "assert";
import * as sinon from "sinon";
import { DiagnosticLogger } from "../../../../src/agent/diagnostics/diagnosticLogger";
import { EtwDiagnosticLogger } from "../../../../src/agent/diagnostics/etwDiagnosticLogger";
import { EtwWriter } from "../../../../src/agent/diagnostics/writers/etwWriter";

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
