import * as assert from "assert";
import * as sinon from "sinon";

import { AppServicesLoader } from "../../../src/agent/appServicesLoader";
import { ConsoleWriter } from "../../../src/agent/diagnostics/consoleWriter";
import { DiagnosticLogger } from "../../../src/agent/diagnostics/diagnosticLogger";
import { EtwDiagnosticLogger } from "../../../src/agent/diagnostics/etwDiagnosticLogger";
import { FileWriter } from "../../../src/agent/diagnostics/fileWriter";

describe("agent/AppServicesLoader", () => {
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
            ["HOME"]: "c:",
        };
        process.env = env;
        const agent = new AppServicesLoader();
        let diagnosticLogger: any = agent["_diagnosticLogger"];
        assert.equal(diagnosticLogger["_instrumentationKey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");

        const isWindows = process.platform === 'win32';
        assert.ok(diagnosticLogger instanceof DiagnosticLogger, "Wrong diagnosticLogger type");
        assert.ok(diagnosticLogger["_agentLogger"] instanceof FileWriter, "Wrong diagnosticLogger agentLogger");
        assert.equal(diagnosticLogger["_agentLogger"]["_filename"], "applicationinsights-extension.log");

        let statusLogger: any = agent["_statusLogger"];
        assert.equal(statusLogger["_instrumentationKey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        assert.ok(statusLogger["_agentLogger"] instanceof FileWriter, "Wrong statusLogger agentLogger");
        assert.equal(statusLogger["_agentLogger"]["_filename"], "status_nodejs.json");

        if (isWindows) {
            assert.equal(diagnosticLogger["_agentLogger"]["_filepath"], "c:\\LogFiles\\ApplicationInsights\\status");
            assert.equal(statusLogger["_agentLogger"]["_filepath"], "c:\\LogFiles\\ApplicationInsights\\status");
        }
        else {
            assert.equal(diagnosticLogger["_agentLogger"]["_filepath"], "/var/log/applicationinsights/");
            assert.equal(statusLogger["_agentLogger"]["_filepath"], "/var/log/applicationinsights/");
        }
        // Loader is using correct diagnostics
        assert.equal(agent["_loader"]["_diagnosticLogger"], diagnosticLogger, "Wrong diagnosticLogger");
        assert.equal(agent["_loader"]["_statusLogger"], statusLogger, "Wrong statusLogger");
    });

    it("initialize", () => {
        const agent = new AppServicesLoader();
        let stub = sandbox.stub(agent["_loader"], "initialize");
        agent.initialize();
        // Agent Loader called
        assert.ok(stub.calledOnce);
    });
});
