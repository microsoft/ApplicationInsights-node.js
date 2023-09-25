import assert = require("assert");
import sinon = require("sinon");
import { DiagnosticLogger } from "../../Bootstrap/DiagnosticLogger";
import * as DataModel from "../../Bootstrap/DataModel";
import * as Helpers from "../../Bootstrap/Helpers";
import * as DefaultTypes from "../../Bootstrap/Default";
import { JsonConfig } from "../../Library/JsonConfig";
import * as applicationinsights from "../../applicationinsights";


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
        applicationinsights.dispose();
    });

    it("should return the client if started multiple times", () => {
        const logger = new LoggerSpy();
        const env = <{ [id: string]: string }>{};
        env["ApplicationInsightsAgent_EXTENSION_VERSION"] = "~2";
        env["APPLICATIONINSIGHTS_CONNECTION_STRING"] = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/";
        process.env = env;
        // Test
        const Default = require("../../Bootstrap/Default") as typeof DefaultTypes;
        sandbox.stub(Helpers, "sdkAlreadyExists", () => false);
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
        sandbox.stub(Helpers, "sdkAlreadyExists", () => false);
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
        sinon.stub(Helpers, "sdkAlreadyExists", () => false);
        Default.setLogger(new DiagnosticLogger(logger));

        let result = Default.setupAndStart();
        assert.equal(result, null);
        assert.equal(logger.logCount, 0);
        assert.equal(logger.errorCount, 1);
    });

    it("Azure Functions, default config", () => {
        const env = <{ [id: string]: string }>{};
        env["APPLICATIONINSIGHTS_CONNECTION_STRING"] = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/";
        process.env = env;

        // Test
        const Default = require("../../Bootstrap/Default") as typeof DefaultTypes;
        let result = Default.setupAndStart(null, true);
        assert.equal(result.defaultClient.config.enableSendLiveMetrics, false, "wrong enableSendLiveMetrics");
        assert.equal(result.defaultClient.config.enableAutoCollectPerformance, false, "wrong enableAutoCollectPerformance");
        assert.equal(result.defaultClient.config.enableAutoCollectPreAggregatedMetrics, false), "wrong enableAutoCollectPreAggregatedMetrics";
        assert.equal(result.defaultClient.config.enableAutoCollectIncomingRequestAzureFunctions, false), "wrong enableAutoCollectIncomingRequestAzureFunctions";
        assert.equal(result.defaultClient.config.enableAutoCollectRequests, false, "wrong enableAutoCollectRequests");
        assert.equal(result.defaultClient.config.enableAutoCollectDependencies, true, "wrong enableAutoCollectDependencies");
        assert.equal(result.defaultClient.config.enableAutoCollectHeartbeat, true, "wrong enableAutoCollectHeartbeat");
        assert.equal(result.defaultClient.config.enableUseDiskRetryCaching, true, "wrong enableUseDiskRetryCaching");
    });

    it("Azure Functions, should not override configuration provided in JSON config", () => {
        const env = <{ [id: string]: string }>{};
        const config = {
            enableSendLiveMetrics: true,
            enableAutoCollectPerformance: true,
            enableAutoCollectPreAggregatedMetrics: true,
            enableAutoCollectIncomingRequestAzureFunctions: true,
            enableAutoCollectRequests: true,
            enableAutoCollectDependencies: false,
            enableAutoCollectHeartbeat: false,
            enableUseDiskRetryCaching: false,
        }
        env["APPLICATIONINSIGHTS_CONFIGURATION_CONTENT"] = JSON.stringify(config);
        env["APPLICATIONINSIGHTS_CONNECTION_STRING"] = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/";
        process.env = env;

        // Test
        const Default = require("../../Bootstrap/Default") as typeof DefaultTypes;
        let result = Default.setupAndStart(null, true);
        assert.equal(result.defaultClient.config.enableSendLiveMetrics, true, "wrong enableSendLiveMetrics");
        assert.equal(result.defaultClient.config.enableAutoCollectPerformance, true, "wrong enableAutoCollectPerformance");
        assert.equal(result.defaultClient.config.enableAutoCollectPreAggregatedMetrics, true), "wrong enableAutoCollectPreAggregatedMetrics";
        assert.equal(result.defaultClient.config.enableAutoCollectIncomingRequestAzureFunctions, true), "wrong enableAutoCollectIncomingRequestAzureFunctions";
        assert.equal(result.defaultClient.config.enableAutoCollectRequests, true, "wrong enableAutoCollectRequests");
        assert.equal(result.defaultClient.config.enableAutoCollectDependencies, false, "wrong enableAutoCollectDependencies");
        assert.equal(result.defaultClient.config.enableAutoCollectHeartbeat, false, "wrong enableAutoCollectHeartbeat");
        assert.equal(result.defaultClient.config.enableUseDiskRetryCaching, false, "wrong enableUseDiskRetryCaching");
    });

    it("App Services, default config", () => {
        const env = <{ [id: string]: string }>{};
        env["APPLICATIONINSIGHTS_CONNECTION_STRING"] = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/";
        process.env = env;

        // Test
        const Default = require("../../Bootstrap/Default") as typeof DefaultTypes;
        let result = Default.setupAndStart(null, false);
        assert.equal(result.defaultClient.config.enableSendLiveMetrics, true, "wrong enableSendLiveMetrics");
        assert.equal(result.defaultClient.config.enableAutoCollectPerformance, true, "wrong enableAutoCollectPerformance");
        assert.equal(result.defaultClient.config.enableAutoCollectPreAggregatedMetrics, true), "wrong enableAutoCollectPreAggregatedMetrics";
        assert.equal(result.defaultClient.config.enableAutoCollectIncomingRequestAzureFunctions, false), "wrong enableAutoCollectIncomingRequestAzureFunctions";
        assert.equal(result.defaultClient.config.enableAutoCollectRequests, true, "wrong enableAutoCollectRequests");
        assert.equal(result.defaultClient.config.enableAutoCollectDependencies, true, "wrong enableAutoCollectDependencies");
        assert.equal(result.defaultClient.config.enableAutoCollectHeartbeat, true, "wrong enableAutoCollectHeartbeat");
        assert.equal(result.defaultClient.config.enableUseDiskRetryCaching, true, "wrong enableUseDiskRetryCaching");
    });

    it("App Services, should not override configuration provided in JSON config", () => {
        const env = <{ [id: string]: string }>{};
        const config = {
            enableSendLiveMetrics: false,
            enableAutoCollectPerformance: false,
            enableAutoCollectPreAggregatedMetrics: false,
            enableAutoCollectIncomingRequestAzureFunctions: true,
            enableAutoCollectRequests: false,
            enableAutoCollectDependencies: false,
            enableAutoCollectHeartbeat: false,
            enableUseDiskRetryCaching: false,
        }
        env["APPLICATIONINSIGHTS_CONFIGURATION_CONTENT"] = JSON.stringify(config);
        env["APPLICATIONINSIGHTS_CONNECTION_STRING"] = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/";
        process.env = env;

        // Test
        const Default = require("../../Bootstrap/Default") as typeof DefaultTypes;
        let result = Default.setupAndStart(null, false);
        assert.equal(result.defaultClient.config.enableSendLiveMetrics, false, "wrong enableSendLiveMetrics");
        assert.equal(result.defaultClient.config.enableAutoCollectPerformance, false, "wrong enableAutoCollectPerformance");
        assert.equal(result.defaultClient.config.enableAutoCollectPreAggregatedMetrics, false), "wrong enableAutoCollectPreAggregatedMetrics";
        assert.equal(result.defaultClient.config.enableAutoCollectIncomingRequestAzureFunctions, true), "wrong enableAutoCollectIncomingRequestAzureFunctions";
        assert.equal(result.defaultClient.config.enableAutoCollectRequests, false, "wrong enableAutoCollectRequests");
        assert.equal(result.defaultClient.config.enableAutoCollectDependencies, false, "wrong enableAutoCollectDependencies");
        assert.equal(result.defaultClient.config.enableAutoCollectHeartbeat, false, "wrong enableAutoCollectHeartbeat");
        assert.equal(result.defaultClient.config.enableUseDiskRetryCaching, false, "wrong enableUseDiskRetryCaching");
    });
});
