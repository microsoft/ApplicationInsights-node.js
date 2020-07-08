import assert = require("assert");
import sinon = require("sinon");
import { DiagnosticLogger } from "../../Bootstrap/DiagnosticLogger";
import * as DataModel from "../../Bootstrap/DataModel";
import * as Helpers from "../../Bootstrap/Helpers";
import * as DefaultTypes from "../../Bootstrap/Default";

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
    const startSpy = sinon.spy(appInsights, "start");

    before(() => {
        startSpy.reset();
    });

    afterEach(() => {
        startSpy.reset();
        delete require.cache[require.resolve("../../Bootstrap/Default")];
    });

    after(() => {
        startSpy.restore();
    });

    it("should return the client if started multiple times", () => {
        const logger = new LoggerSpy();
        const origEnv = process.env.ApplicationInsightsAgent_EXTENSION_VERSION;
        process.env.ApplicationInsightsAgent_EXTENSION_VERSION = "~2";
        const alreadyExistsStub = sinon.stub(Helpers, "sdkAlreadyExists", () => false);

        // Test
        const Default = require("../../Bootstrap/Default") as typeof DefaultTypes;
        Default.setLogger(new DiagnosticLogger(logger));
        const instance1 = Default.setupAndStart("abc");
        assert.ok(instance1.defaultClient);
        const instance2 = Default.setupAndStart("abc");
        assert.deepEqual(instance1.defaultClient, instance2.defaultClient);
        assert.deepEqual(instance1.defaultClient["_telemetryProcessors"].length, 1)
        assert.deepEqual(instance2.defaultClient["_telemetryProcessors"].length, 1)

        // Cleanup
        alreadyExistsStub.restore();
        instance1.dispose();
        instance2.dispose();
        process.env.ApplicationInsightsAgent_EXTENSION_VERSION = origEnv;
    })

    it("should setup and start the SDK", () => {
        // Setup env vars before requiring loader
        const logger = new LoggerSpy();
        const origEnv = process.env.ApplicationInsightsAgent_EXTENSION_VERSION;
        process.env.ApplicationInsightsAgent_EXTENSION_VERSION = "~2";
        const alreadyExistsStub = sinon.stub(Helpers, "sdkAlreadyExists", () => false);

        // Test
        const Default = require("../../Bootstrap/Default") as typeof DefaultTypes;
        Default.setLogger(new DiagnosticLogger(logger));
        const instance = Default.setupAndStart("abc");
        assert.deepEqual(instance, appInsights);

        // Cleanup
        alreadyExistsStub.restore();
        instance.dispose();
        process.env.ApplicationInsightsAgent_EXTENSION_VERSION = origEnv;

        // start was called once
        assert.equal(startSpy.callCount, 1);

        // No logging was done
        assert.equal(logger.logCount, 1);
        assert.equal(logger.errorCount, 0);
    });

    it("should not setup and start the SDK if no setupString is provided", () => {
        // Setup
        const logger = new LoggerSpy();
        const origEnv = process.env.ApplicationInsightsAgent_EXTENSION_VERSION;
        const origIkey = process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
        const origCs = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
        process.env.ApplicationInsightsAgent_EXTENSION_VERSION = "~2";
        delete process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
        delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
        const alreadyExistsStub = sinon.stub(Helpers, "sdkAlreadyExists", () => false);

        // Test
        const Default = require("../../Bootstrap/Default") as typeof DefaultTypes;
        Default.setLogger(new DiagnosticLogger(logger));
        const instance = Default.setupAndStart();
        assert.equal(instance, null);

        // Cleanup
        alreadyExistsStub.restore();
        process.env.ApplicationInsightsAgent_EXTENSION_VERSION = origEnv;

        // start was never called
        assert.equal(startSpy.callCount, 0);

        // No logging was done
        assert.equal(logger.logCount, 0);
        assert.equal(logger.errorCount, 1, "Should log if attach is attempted");

        process.env.APPINSIGHTS_INSTRUMENTATIONKEY = origIkey;
        process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = origCs;
    });
});
