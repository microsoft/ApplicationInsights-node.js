import * as assert from "assert";
import * as sinon from "sinon";

import { AgentLoader } from "../../../src/agent/agentLoader";
import { IDiagnosticLogger } from "../../../src/agent/types";

describe("agent/agentLoader", () => {
    let originalEnv: NodeJS.ProcessEnv;
    let sandbox: sinon.SinonSandbox;

    const defaultConfig = {
        azureMonitorExporterOptions: {
            disableOfflineStorage: false,
        },
        enableAutoCollectExceptions: true,
        enableAutoCollectPerformance: true,
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
        assert.ok(diagnosticLoggerStub.calledOnce);
    });
});
