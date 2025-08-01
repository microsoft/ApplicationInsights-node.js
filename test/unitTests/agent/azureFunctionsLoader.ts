import assert from "assert";
import sinon from "sinon";

import { AzureFunctionsLoader } from "../../../src/agent/azureFunctionsLoader";
import { DiagnosticLogger } from "../../../src/agent/diagnostics/diagnosticLogger";
import { AzureFunctionsWriter } from "../../../src/agent/diagnostics/writers/azureFunctionsWriter";
import { 
    SEMRESATTRS_SERVICE_INSTANCE_ID,
    SEMRESATTRS_SERVICE_NAME
 } from "@opentelemetry/semantic-conventions";

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
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]:
                "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
        };
        process.env = env;
        const agent = new AzureFunctionsLoader();
        let diagnosticLogger: any = agent["_diagnosticLogger"];
        assert.equal(
            diagnosticLogger["_instrumentationKey"],
            "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"
        );
        assert.ok(diagnosticLogger instanceof DiagnosticLogger);
        assert.ok(diagnosticLogger["_agentLogger"] instanceof AzureFunctionsWriter);
        let statusLogger: any = agent["_statusLogger"];
        assert.equal(statusLogger["_instrumentationKey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        assert.ok(statusLogger["_agentLogger"] instanceof AzureFunctionsWriter);
        // Loader is using correct diagnostics
        assert.equal(agent["_diagnosticLogger"], diagnosticLogger);
        assert.equal(agent["_statusLogger"], statusLogger);
    });

    it("initialize", () => {
        const agent = new AzureFunctionsLoader();
        let stub = sandbox.stub(agent, "initialize");
        agent.initialize();
        // Agent Loader called
        assert.ok(stub.calledOnce);
        // Custom config
        assert.equal(agent["_options"].enableAutoCollectPerformance, false);
    });

    it("should correctly set Azure Resource Attributes", () => {
        const env = <{ [id: string]: string }>{};
        const originalEnv = process.env;
        env.WEBSITE_SITE_NAME = "testRole";
        env.WEBSITE_INSTANCE_ID = "testRoleInstanceId";
        process.env = env;
        const agent = new AzureFunctionsLoader();
        let stub = sandbox.stub(agent, "initialize");
        agent.initialize();
        process.env = originalEnv;
        // Agent Loader called
        assert.ok(stub.calledOnce);
        assert.equal(
            agent["_options"].resource.attributes[SEMRESATTRS_SERVICE_INSTANCE_ID],
            "testRoleInstanceId"
        );
        assert.equal(
            agent["_options"].resource.attributes[SEMRESATTRS_SERVICE_NAME],
            "testRole"
        );
    });
});
