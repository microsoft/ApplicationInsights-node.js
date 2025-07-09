// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert = require("assert");
import sinon from "sinon";

import { AgentLoader } from "../../../src/agent/agentLoader";
import * as azureMonitor from "@azure/monitor-opentelemetry";
import { DiagnosticMessageId } from "../../../src/agent/types";

describe("agent/agentLoader", () => {
    let originalEnv: NodeJS.ProcessEnv;
    let sandbox: sinon.SinonSandbox;

    const defaultConfig = {
        azureMonitorExporterOptions: {
            disableOfflineStorage: false,
        },
        enableAutoCollectExceptions: true,
        enableAutoCollectPerformance: true,
        enableLiveMetrics: true,
        samplingRatio: 1, // Sample all telemetry by default
        instrumentationOptions: {
            azureSdk: {
                enabled: true
            },
            http: {
                enabled: true
            },
            mongoDb: {
                enabled: true
            },
            mySql: {
                enabled: true
            },
            postgreSql: {
                enabled: true
            },
            redis4: {
                enabled: true
            },
            redis: {
                enabled: true
            },
        }
    };

    before(() => {
        sandbox = sinon.createSandbox();
    });

    beforeEach(() => {
        originalEnv = process.env;
    });

    afterEach(() => {
        process.env = originalEnv;
        sandbox.restore();
    });
    
    it("should initialize constructor", () => {
        const env = {
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
        };
        process.env = env;
        const agent = new AgentLoader();
        const diagnosticLogger: any = agent["_diagnosticLogger"];

        assert.strictEqual(agent["_canLoad"], true);
        assert.deepStrictEqual(agent["_options"], defaultConfig);
        assert.strictEqual(diagnosticLogger["_instrumentationKey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
    });

    it("should get blank instrumentation key if not defined", () => {
        const env = {
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "",
        };
        process.env = env;
        const agent = new AgentLoader();

        assert(agent["_instrumentationKey"], "");
    });

    it("should initialize when called", () => {
        const env = {
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
        };
        process.env = env;
        const agent = new AgentLoader();
        const diagnosticLoggerStub = sandbox.stub(agent["_diagnosticLogger"], "logMessage");
        
        const initAgent = agent.initialize();
        assert.equal(process.env["AZURE_MONITOR_AUTO_ATTACH"], "true");
        assert.ok(diagnosticLoggerStub.calledOnce);
    });

    it("should send a message to the console if initialize is called when canLoad is false", () => {
        const env = {
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
        };
        process.env = env;
        const agent = new AgentLoader();
        const consoleLoggerStub = sandbox.stub(console, "log");
        agent["_canLoad"] = false;
        
        agent.initialize();
        assert.ok(consoleLoggerStub.calledOnce);
    });

    it("should call both the diagnostic and status loggers if the connection string is not defined", () => {
        const env = {
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "",
        };
        process.env = env;
        const agent = new AgentLoader();
        const diagnosticLoggerStub = sandbox.stub(agent["_diagnosticLogger"], "logMessage");
        const statusLoggerStub = sandbox.stub(agent["_statusLogger"], "logStatus");
        
        agent["_instrumentationKey"] = "unknown";
        const validationResult: boolean = agent["_validate"]();

        assert.ok(diagnosticLoggerStub.calledOnce);
        assert.ok(statusLoggerStub.calledOnce);
        assert.ok(!validationResult);
    });

    it("should set logger", () => {
        const env = {
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
        };
        process.env = env;
        const agent = new AgentLoader();
        const logger = {
            logMessage: () => { }
        };
        agent.setLogger(logger);
        assert.deepStrictEqual(agent["_diagnosticLogger"], logger);
    });

    it("should handle initialization errors", () => {
        const env = {
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
        };
        process.env = env;
        const agent = new AgentLoader();
        const azureMonitorStub = sandbox.stub(azureMonitor, "useAzureMonitor").throws(new Error("test"));
        const diagnosticLoggerStub = sandbox.stub(agent["_diagnosticLogger"], "logMessage");
        const statusLoggerStub = sandbox.stub(agent["_statusLogger"], "logStatus");
        agent.initialize();
        assert.ok(azureMonitorStub.calledOnce);
        assert.ok(diagnosticLoggerStub.calledOnce);
        assert.ok(statusLoggerStub.calledOnce);
        assert.deepEqual(statusLoggerStub.args[0][0].AgentInitializedSuccessfully, false);
        assert.deepEqual(diagnosticLoggerStub.args[0][0].messageId, DiagnosticMessageId.unknownError);
    });

    it("should handle validation errors", () => {
        const env = {
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
        };
        process.env = env;
        const agent = new AgentLoader();
        agent["_instrumentationKey"] = "unknown";
        agent["_sdkAlreadyExists"] = () => { throw new Error("test"); return true; };
        const statusLoggerStub = sandbox.stub(agent["_statusLogger"], "logStatus");
        agent["_validate"]();
        assert.deepEqual(statusLoggerStub.args[0][0].AgentInitializedSuccessfully, false);
    });

    it("should handle sdkAlreadyExits", () => {
        const env = {
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
            ["APPLICATIONINSIGHTS_FORCE_START"]: "false"
        };
        process.env = env;
        const agent = new AgentLoader();
        agent["_sdkAlreadyExists"] = () => true;
        const statusLoggerStub = sandbox.stub(agent["_statusLogger"], "logStatus");
        agent["_validate"]();
        assert.deepEqual(statusLoggerStub.args[0][0].AgentInitializedSuccessfully, false);
    });
});
