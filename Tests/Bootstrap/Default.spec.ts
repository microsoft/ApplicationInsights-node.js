import assert = require("assert");
import sinon = require("sinon");
import { DiagnosticLogger } from "../../Bootstrap/DiagnosticLogger";
import * as DataModel from "../../Bootstrap/DataModel";
import * as DefaultTypes from "../../Bootstrap/Default";
import { JsonConfig } from "../../Library/JsonConfig";


const appInsights = require("../../applicationinsights");

class LoggerSpy implements DataModel.AgentLogger {
    public logCount = 0
    public errorCount = 0;

    public log() {
        this.logCount++;
    }
    public error() {
        this.errorCount++;
    }
}

describe("#setupAndStart()", () => {
    let startSpy: sinon.SinonSpy;
    var sandbox: sinon.SinonSandbox;
    let originalEnv: NodeJS.ProcessEnv;

    before(() => {
        sandbox = sinon.sandbox.create();
    });

    beforeEach(() => {
        startSpy = sandbox.spy(appInsights, "start");
        originalEnv = process.env;
        JsonConfig["_instance"] = undefined;
    });

    afterEach(() => {
        process.env = originalEnv;
        sandbox.restore();
        delete require.cache[require.resolve("../../Bootstrap/Default")];
    });

    it("should return the client if started multiple times", () => {
        const logger = new LoggerSpy();
        const env = <{ [id: string]: string }>{};
        env["ApplicationInsightsAgent_EXTENSION_VERSION"] = "~2";
        env["APPLICATIONINSIGHTS_CONNECTION_STRING"] = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/";
        process.env = env;
        // Test
        const Default = require("../../Bootstrap/Default") as typeof DefaultTypes;
        sandbox.stub(Default, "sdkAlreadyExists", () => false);
        Default.setLogger(new DiagnosticLogger(logger));
        const instance1 = Default.setupAndStart();
        assert.ok(instance1.defaultClient);
        const instance2 = Default.setupAndStart();
        assert.deepEqual(instance1.defaultClient, instance2.defaultClient);
        assert.deepEqual(instance1.defaultClient["_telemetryProcessors"].length, 2)
        assert.deepEqual(instance2.defaultClient["_telemetryProcessors"].length, 2)

        // Cleanup
        instance1.dispose();
        instance2.dispose();
    })

    it("should setup and start the SDK", () => {
        // Setup env vars before requiring loader
        const logger = new LoggerSpy();
        const env = <{ [id: string]: string }>{};
        env["ApplicationInsightsAgent_EXTENSION_VERSION"] = "~2";
        env["APPLICATIONINSIGHTS_CONNECTION_STRING"] = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/";
        process.env = env;

        // Test
        const Default = require("../../Bootstrap/Default") as typeof DefaultTypes;
        sandbox.stub(Default, "sdkAlreadyExists", () => false);
        Default.setLogger(new DiagnosticLogger(logger));
        const instance = Default.setupAndStart();
        assert.deepEqual(instance, appInsights);

        // Cleanup
        instance.dispose();

        // start was called once
        assert.equal(startSpy.callCount, 1);

        // No logging was done
        assert.equal(logger.logCount, 1);
        assert.equal(logger.errorCount, 0);
    });

    it("should not setup and start the SDK if no connectionString is provided", () => {
        // Setup
        const logger = new LoggerSpy();
        const env = <{ [id: string]: string }>{};
        env["ApplicationInsightsAgent_EXTENSION_VERSION"] = "~2";
        process.env = env;

        // Test
        const Default = require("../../Bootstrap/Default") as typeof DefaultTypes;
        sinon.stub(Default, "sdkAlreadyExists", () => false);
        Default.setLogger(new DiagnosticLogger(logger));

        let result = Default.setupAndStart();
        assert.equal(result, null);
        assert.equal(logger.logCount, 0);
        assert.equal(logger.errorCount, 1);
    });
});
