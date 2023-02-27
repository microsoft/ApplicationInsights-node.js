import * as assert from "assert";
import * as sinon from "sinon";

import { AKSLoader } from "../../../src/agent/aksLoader";
import { ConsoleWriter } from "../../../src/agent/diagnostics/writers/consoleWriter";
import { DiagnosticLogger } from "../../../src/agent/diagnostics/diagnosticLogger";

describe("agent/AKSLoader", () => {
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
        const agent = new AKSLoader();
        let diagnosticLogger: any = agent["_diagnosticLogger"];
        assert.equal(diagnosticLogger["_instrumentationKey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        assert.ok(diagnosticLogger instanceof DiagnosticLogger);
        assert.ok(diagnosticLogger["_agentLogger"] instanceof ConsoleWriter);
        let statusLogger: any = agent["_statusLogger"];
        assert.equal(statusLogger["_instrumentationKey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        assert.ok(statusLogger["_agentLogger"] instanceof ConsoleWriter);
        // Loader is using correct diagnostics
        assert.equal(agent["_diagnosticLogger"], diagnosticLogger, "Wrong diagnosticLogger");
        assert.equal(agent["_statusLogger"], statusLogger, "Wrong statusLogger");
    });

    it("initialize", () => {
        const agent = new AKSLoader();
        let stub = sandbox.stub(agent, "initialize");
        agent.initialize();
        // Agent Loader called
        assert.ok(stub.calledOnce);
    });
});
