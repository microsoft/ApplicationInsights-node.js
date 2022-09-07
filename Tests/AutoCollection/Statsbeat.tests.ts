import assert = require("assert");
import sinon = require("sinon");
import nock = require("nock");

import AppInsights = require("../../applicationinsights");
import Statsbeat = require("../../AutoCollection/Statsbeat");
import Constants = require("../../Declarations/Constants");
import TelemetryClient = require("../../Library/TelemetryClient");
import Config = require("../../Library/Config");

describe("AutoCollection/Statsbeat", () => {
    var sandbox: sinon.SinonSandbox;
    const config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
    let statsBeat: Statsbeat = null;

    beforeEach(() => {
        Statsbeat.NON_EU_CONNECTION_STRING = "InstrumentationKey=2aa22222-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://westus-0.in.applicationinsights.azure.com/"
        Statsbeat.EU_CONNECTION_STRING = "InstrumentationKey=2aa22222-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://westeurope-5.in.applicationinsights.azure.com/"
        sandbox = sinon.sandbox.create();
        statsBeat = new Statsbeat(config);
    });

    afterEach(() => {
        sandbox.restore();
        AppInsights.dispose();
        statsBeat.enable(false);
        statsBeat = null;
    });

    after(() => {
        nock.cleanAll();
    });

    describe("#init and #disable()", () => {
        it("init should enable and dispose should stop autocollection interval", () => {
            var setIntervalSpy = sandbox.spy(global, "setInterval");
            var clearIntervalSpy = sandbox.spy(global, "clearInterval");
            let client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            assert.equal(setIntervalSpy.callCount, 2, "setInterval should be called twice as part of Statsbeat initialization");
            client.getStatsbeat().enable(false);
            assert.equal(clearIntervalSpy.callCount, 2, "clearInterval should be called twice as part of Statsbeat disable");
        });

        it("init should use non EU connection string", () => {
            let testConfig = new Config("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://westus-0.in.applicationinsights.azure.com/");
            let statsbeat = new Statsbeat(testConfig);
            assert.equal(statsbeat["_statsbeatConfig"].endpointUrl, "https://westus-0.in.applicationinsights.azure.com/v2.1/track");
        });

        it("init should use EU connection string", () => {
            let testConfig = new Config("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://northeurope-0.in.applicationinsights.azure.com/");
            let statsbeat = new Statsbeat(testConfig);
            assert.equal(statsbeat["_statsbeatConfig"].endpointUrl, "https://westeurope-5.in.applicationinsights.azure.com/v2.1/track");
        });

        it("_getShortHost", () => {
            assert.equal(statsBeat["_getShortHost"]("http://westus02-1.in.applicationinsights.azure.com"), "westus02");
            assert.equal(statsBeat["_getShortHost"]("https://westus02-1.in.applicationinsights.azure.com"), "westus02");
            assert.equal(statsBeat["_getShortHost"]("https://dc.services.visualstudio.com"), "dc");
            assert.equal(statsBeat["_getShortHost"]("https://www.test.com"), "test");
        });
    });

    describe("#Resource provider property", () => {
        it("unknown resource provider", (done) => {
            statsBeat["_getResourceProvider"]().then(() => {
                assert.equal(statsBeat["_resourceProvider"], "unknown");
                assert.equal(statsBeat["_resourceIdentifier"], "unknown");
                done();
            }).catch((error) => { done(error); });
        });

        it("app service", (done) => {
            var newEnv = <{ [id: string]: string }>{};
            newEnv["WEBSITE_SITE_NAME"] = "Test Website";
            newEnv["WEBSITE_HOME_STAMPNAME"] = "test_home";
            var originalEnv = process.env;
            process.env = newEnv;
            statsBeat["_getResourceProvider"]().then(() => {
                process.env = originalEnv;
                assert.equal(statsBeat["_resourceProvider"], "appsvc");
                assert.equal(statsBeat["_resourceIdentifier"], "Test Website/test_home");
                done();
            }).catch((error) => { done(error); });
        });

        it("Azure Function", (done) => {
            var newEnv = <{ [id: string]: string }>{};
            newEnv["FUNCTIONS_WORKER_RUNTIME"] = "test";
            newEnv["WEBSITE_HOSTNAME"] = "test_host";
            var originalEnv = process.env;
            process.env = newEnv;
            statsBeat["_getResourceProvider"]().then(() => {
                process.env = originalEnv;
                assert.equal(statsBeat["_resourceProvider"], "functions");
                assert.equal(statsBeat["_resourceIdentifier"], "test_host");
                done();
            }).catch((error) => { done(error); });

        });

        it("Azure VM", (done) => {
            var newEnv = <{ [id: string]: string }>{};
            var originalEnv = process.env;
            process.env = newEnv;
            let interceptor = nock("http://169.254.169.254")
                .get("/metadata/instance/compute", (body: string) => {
                    return true;
                });
            interceptor.reply(200, {
                "vmId": "testId",
                "subscriptionId": "testsubscriptionId",
                "osType": "testOsType"
            });
            statsBeat["_getResourceProvider"]().then(() => {
                process.env = originalEnv;
                assert.equal(statsBeat["_resourceProvider"], "vm");
                assert.equal(statsBeat["_resourceIdentifier"], "testId/testsubscriptionId");
                assert.equal(statsBeat["_os"], "testOsType");
                done();
            }).catch((error) => { done(error); });
        });
    });

    describe("#trackStatbeats", () => {
        beforeEach(() => {
            // Prevent handles to be initialized
            statsBeat["_longHandle"] = setInterval(() => { }, 0);
            statsBeat["_handle"] = setInterval(() => { }, 0);
        });

        it("It adds correct network properties to custom metric", (done) => {
            statsBeat.enable(true);
            const sendStub = sandbox.stub(statsBeat, "_sendStatsbeats");
            statsBeat.countRequest(1, "testEndpointHost", 123, true, 200);
            statsBeat.setCodelessAttach();
            statsBeat.trackShortIntervalStatsbeats().then(() => {
                assert.ok(sendStub.called, "should call _sendStatsbeats");
                let metric = statsBeat["_statbeatMetrics"].filter(f => f.name === "Request Duration")[0];
                assert.ok(metric, "Statsbeat Request not found");
                assert.equal(metric.value, 123);
                assert.equal((<any>(metric.properties))["attach"], "codeless");
                assert.equal((<any>(metric.properties))["cikey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert.equal((<any>(metric.properties))["language"], "node");
                assert.equal((<any>(metric.properties))["rp"], "unknown");
                assert.equal((<any>(metric.properties))["endpoint"], 1);
                assert.equal((<any>(metric.properties))["host"], "testEndpointHost");
                assert.ok((<any>(metric.properties))["os"]);
                assert.ok((<any>(metric.properties))["runtimeVersion"]);
                assert.ok((<any>(metric.properties))["version"]);

                done();
            }).catch((error) => { done(error); });
        });

        it("Track duration", (done) => {
            statsBeat.enable(true);
            const sendStub = sandbox.stub(statsBeat, "_sendStatsbeats");
            statsBeat.countRequest(0, "test", 1000, true, 200);
            statsBeat.countRequest(0, "test", 500, false, 408);
            statsBeat.trackShortIntervalStatsbeats().then((error) => {
                assert.ok(sendStub.called, "should call _sendStatsbeats");
                assert.equal(statsBeat["_statbeatMetrics"].length, 3);
                let metric = statsBeat["_statbeatMetrics"].filter(f => f.name === "Request Duration")[0];
                assert.ok(metric, "Request Duration metric not found");
                assert.equal(metric.value, 750);
                done();
            }).catch((error) => { done(error); });
        });

        it("Track counts", (done) => {
            statsBeat.enable(true);
            const sendStub = sandbox.stub(statsBeat, "_sendStatsbeats");
            statsBeat.countRequest(0, "test", 1, true, 200);
            statsBeat.countRequest(0, "test", 1, true, 200);
            statsBeat.countRequest(0, "test", 1, true, 200);
            statsBeat.countRequest(0, "test", 1, true, 200);
            statsBeat.countRequest(0, "test", 1, false, 200);
            statsBeat.countRequest(0, "test", 1, false, 200);
            statsBeat.countRequest(0, "test", 1, false, 200);
            statsBeat.countRetry(0, "test", 206);
            statsBeat.countRetry(0, "test", 206);
            statsBeat.countThrottle(0, "test", 206);
            statsBeat.countException(0, "test", "Statsbeat Exception");
            statsBeat.trackShortIntervalStatsbeats().then(() => {
                assert.ok(sendStub.called, "should call _sendStatsbeats");
                assert.equal(statsBeat["_statbeatMetrics"].length, 6);
                let metric = statsBeat["_statbeatMetrics"].filter(f => f.name === "Request Success Count")[0];
                assert.ok(metric, "Request Success Count metric not found");
                assert.equal(metric.value, 4);
                metric = statsBeat["_statbeatMetrics"].filter(f => f.name === "Request Failure Count")[0];
                assert.ok(metric, "Request Failure Count metric not found");
                assert.equal(metric.value, 3);
                metric = statsBeat["_statbeatMetrics"].filter(f => f.name === "Retry Count")[0];
                assert.ok(metric, "Retry Count metric not found");
                assert.equal(metric.value, 2);
                metric = statsBeat["_statbeatMetrics"].filter(f => f.name === "Throttle Count")[0];
                assert.ok(metric, "Throttle Count metric not found");
                assert.equal(metric.value, 1);
                metric = statsBeat["_statbeatMetrics"].filter(f => f.name === "Exception Count")[0];
                assert.ok(metric, "Exception Count metric not found");
                assert.equal(metric.value, 1);
                done();
            }).catch((error) => { done(error); });
        });

        it("Track attach Statbeat", (done) => {
            statsBeat.enable(true);
            const sendStub = sandbox.stub(statsBeat, "_sendStatsbeats");
            statsBeat.trackLongIntervalStatsbeats().then(() => {
                assert.ok(sendStub.called, "should call _sendStatsbeats");
                let metric = statsBeat["_statbeatMetrics"].filter(f => f.name === "Attach")[0];
                assert.ok(metric, "attach metric not found");
                assert.equal(metric.value, 1);
                assert.equal((<any>(metric.properties))["cikey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert.equal((<any>(metric.properties))["language"], "node");
                assert.equal((<any>(metric.properties))["rp"], "unknown");
                assert.equal((<any>(metric.properties))["rpId"], "unknown");
                assert.equal((<any>(metric.properties))["attach"], "sdk");
                assert.ok((<any>(metric.properties))["os"]);
                assert.ok((<any>(metric.properties))["runtimeVersion"]);
                assert.ok((<any>(metric.properties))["version"]);
                done();
            }).catch((error) => { done(error); });
        });

        it("Track feature Statbeat", (done) => {
            statsBeat.enable(true);
            statsBeat.addFeature(Constants.StatsbeatFeature.DISK_RETRY);
            const sendStub = sandbox.stub(statsBeat, "_sendStatsbeats");
            statsBeat.trackLongIntervalStatsbeats().then(() => {
                assert.ok(sendStub.called, "should call _sendStatsbeats");
                let metric = statsBeat["_statbeatMetrics"].filter(f => f.name === "Feature")[0];
                assert.ok(metric, "feature metric not found");
                assert.equal(metric.name, "Feature");
                assert.equal(metric.value, 1);
                assert.equal((<any>(metric.properties))["type"], 0);
                assert.equal((<any>(metric.properties))["cikey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert.equal((<any>(metric.properties))["language"], "node");
                assert.equal((<any>(metric.properties))["rp"], "unknown");
                assert.equal((<any>(metric.properties))["attach"], "sdk");
                assert.equal((<any>(metric.properties))["feature"], 1);
                assert.ok((<any>(metric.properties))["os"]);
                assert.ok((<any>(metric.properties))["runtimeVersion"]);
                assert.ok((<any>(metric.properties))["version"]);
                done();
            }).catch((error) => { done(error); });
        });

        it("Track instrumentation Statbeat", (done) => {
            statsBeat.enable(true);
            statsBeat.addInstrumentation(Constants.StatsbeatInstrumentation.AZURE_CORE_TRACING);
            const sendStub = sandbox.stub(statsBeat, "_sendStatsbeats");
            statsBeat.trackLongIntervalStatsbeats().then(() => {
                assert.ok(sendStub.called, "should call _sendStatsbeats");
                let metric = statsBeat["_statbeatMetrics"].filter(f => f.name === "Feature")[0];
                assert.ok(metric, "instrumentation metric not found");
                assert.equal(metric.name, "Feature");
                assert.equal(metric.value, 1);
                assert.equal((<any>(metric.properties))["type"], 1);
                assert.equal((<any>(metric.properties))["cikey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert.equal((<any>(metric.properties))["language"], "node");
                assert.equal((<any>(metric.properties))["rp"], "unknown");
                assert.equal((<any>(metric.properties))["attach"], "sdk");
                assert.equal((<any>(metric.properties))["feature"], 1);
                assert.ok((<any>(metric.properties))["os"]);
                assert.ok((<any>(metric.properties))["runtimeVersion"]);
                assert.ok((<any>(metric.properties))["version"]);
                done();
            }).catch((error) => { done(error); });
        });

        it("Instrumentations", () => {
            statsBeat.addInstrumentation(Constants.StatsbeatInstrumentation.AZURE_CORE_TRACING);
            assert.equal(statsBeat["_instrumentation"], 1);
            statsBeat.addInstrumentation(Constants.StatsbeatInstrumentation.MONGODB);
            assert.equal(statsBeat["_instrumentation"], 3);
            statsBeat.addInstrumentation(Constants.StatsbeatInstrumentation.MYSQL);
            assert.equal(statsBeat["_instrumentation"], 7);
            statsBeat.removeInstrumentation(Constants.StatsbeatInstrumentation.AZURE_CORE_TRACING);
            assert.equal(statsBeat["_instrumentation"], 6);
            statsBeat.removeInstrumentation(Constants.StatsbeatInstrumentation.MYSQL);
            assert.equal(statsBeat["_instrumentation"], 2);
        });

        it("Features", () => {
            statsBeat.addFeature(Constants.StatsbeatFeature.DISK_RETRY);
            assert.equal(statsBeat["_feature"], 1);
            statsBeat.addFeature(Constants.StatsbeatFeature.AAD_HANDLING);
            assert.equal(statsBeat["_feature"], 3);
            statsBeat.removeFeature(Constants.StatsbeatFeature.DISK_RETRY);
            assert.equal(statsBeat["_feature"], 2);
        });

        it("Multiple network categories and endpoints", (done) => {
            statsBeat.enable(true);
            const sendStub = sandbox.stub(statsBeat, "_sendStatsbeats");
            statsBeat.countRequest(0, "https://breezeFirstEndpoint.something.com", 100, true, 200);
            statsBeat.countRequest(1, "http://quickpulseEndpoint.something.com", 200, true, 200);
            statsBeat.countRequest(0, "breezeSecondEndpoint", 400, true, 200);
            statsBeat.trackShortIntervalStatsbeats().then(() => {
                assert.ok(sendStub.called, "should call _sendStatsbeats");
                let metric: any = statsBeat["_statbeatMetrics"].find(f => f.name === "Request Duration"
                    && f.value === 100);
                assert.ok(metric, "breezeFirstEndpoint metric not found");
                assert.equal((<any>(metric.properties))["endpoint"], 0);
                assert.equal((<any>(metric.properties))["host"], "breezeFirstEndpoint");
                metric = statsBeat["_statbeatMetrics"].find(f => f.name === "Request Duration"
                    && f.value === 200);
                assert.ok(metric, "quickpulseEndpoint metric not found");
                assert.equal((<any>(metric.properties))["endpoint"], 1);
                assert.equal((<any>(metric.properties))["host"], "quickpulseEndpoint");
                metric = statsBeat["_statbeatMetrics"].find(f => f.name === "Request Duration"
                    && f.value === 400);
                assert.ok(metric, "breezeSecondEndpoint metric not found");
                assert.equal((<any>(metric.properties))["endpoint"], 0);
                assert.equal((<any>(metric.properties))["host"], "breezeSecondEndpoint");
                done();
            }).catch((error) => { done(error); });
        });
    });
});