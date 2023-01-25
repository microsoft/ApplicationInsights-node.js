import * as assert from "assert";
import * as sinon from "sinon";

import { AzureFunctionsLoader } from "../../../src/agent/azureFunctionsLoader";
import { ConsoleWriter } from "../../../src/agent/diagnostics/consoleWriter";
import { DiagnosticLogger } from "../../../src/agent/diagnostics/diagnosticLogger";

describe("agent/AzureFunctionsLoader", () => {
    let originalEnv: NodeJS.ProcessEnv;
    let sandbox: sinon.SinonSandbox;

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

    it("constructor", () => {
        const env = {
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
        };
        process.env = env;
        const agent = new AzureFunctionsLoader();
        let diagnosticLogger: any = agent["_diagnosticLogger"];
        assert.equal(diagnosticLogger["_instrumentationKey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        assert.ok(diagnosticLogger instanceof DiagnosticLogger);
        assert.ok(diagnosticLogger["_agentLogger"] instanceof ConsoleWriter);
        let statusLogger: any = agent["_statusLogger"];
        assert.equal(statusLogger["_instrumentationKey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        assert.ok(statusLogger["_agentLogger"] instanceof ConsoleWriter);
        // Loader is using correct diagnostics
        assert.equal(agent["_loader"]["_diagnosticLogger"], diagnosticLogger);
        assert.equal(agent["_loader"]["_statusLogger"], statusLogger);
    });

    it("initialize", () => {
        const agent = new AzureFunctionsLoader();
        let stub = sandbox.stub(agent["_loader"], "initialize");
        agent.initialize();
        // Agent Loader called
        assert.ok(stub.calledOnce);
        // Custom config
        assert.equal(agent["_config"].enableAutoCollectStandardMetrics, false);
        assert.equal(agent["_config"].enableAutoCollectPerformance, false);
    });
});
