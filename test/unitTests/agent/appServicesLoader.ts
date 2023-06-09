import * as assert from "assert";
import * as sinon from "sinon";

import { AppServicesLoader } from "../../../src/agent/appServicesLoader";
import { DiagnosticLogger } from "../../../src/agent/diagnostics/diagnosticLogger";
import { FileWriter } from "../../../src/agent/diagnostics/writers/fileWriter";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

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

        // Prefix Env variable should be set
        assert.equal(process.env["AZURE_MONITOR_AGENT_PREFIX"].length, 3, "Missing prefix");

        if (isWindows) {
            assert.equal(diagnosticLogger["_agentLogger"]["_filepath"], "c:\\LogFiles\\ApplicationInsights\\status");
            assert.equal(statusLogger["_agentLogger"]["_filepath"], "c:\\LogFiles\\ApplicationInsights\\status");
            assert.equal(process.env["AZURE_MONITOR_AGENT_PREFIX"], "aw_");
        }
        else {
            assert.equal(diagnosticLogger["_agentLogger"]["_filepath"], "/var/log/applicationinsights/");
            assert.equal(statusLogger["_agentLogger"]["_filepath"], "/var/log/applicationinsights/");
            assert.equal(process.env["AZURE_MONITOR_AGENT_PREFIX"], "al_");
        }
        // Loader is using correct diagnostics
        assert.equal(agent["_diagnosticLogger"], diagnosticLogger, "Wrong diagnosticLogger");
        assert.equal(agent["_statusLogger"], statusLogger, "Wrong statusLogger");

    });

    it("initialize", () => {
        const agent = new AppServicesLoader();
        let stub = sandbox.stub(agent, "initialize");
        agent.initialize();
        // Agent Loader called
        assert.ok(stub.calledOnce);
    });

    it("should correctly set Azure Resource Attributes", () => {
        const env = <{ [id: string]: string }>{};
        const originalEnv = process.env;
        env.WEBSITE_SITE_NAME = "testRole";
        env.WEBSITE_INSTANCE_ID = "testRoleInstanceId";
        process.env = env;
        const agent = new AppServicesLoader();
        let stub = sandbox.stub(agent, "initialize");
        agent.initialize();
        process.env = originalEnv;
        // Agent Loader called
        assert.ok(stub.calledOnce);
        assert.equal(
            agent["_config"].resource.attributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID],
            "testRoleInstanceId"
        );
        assert.equal(
            agent["_config"].resource.attributes[SemanticResourceAttributes.SERVICE_NAME],
            "testRole"
        );
    });
});
