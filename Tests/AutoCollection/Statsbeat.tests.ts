import assert = require("assert");
import sinon = require("sinon");
import nock = require("nock");

import AppInsights = require("../../applicationinsights");
import Statsbeat = require("../../AutoCollection/Statsbeat");
import Constants = require("../../Declarations/Constants");
import Contracts = require("../../Declarations/Contracts");
import TelemetryClient = require("../../Library/TelemetryClient");
import Config = require("../../Library/Config");

describe("AutoCollection/Statsbeat", () => {
    var sandbox: sinon.SinonSandbox;
    const config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
    Statsbeat.CONNECTION_STRING = "InstrumentationKey=2aa22222-bbbb-1ccc-8ddd-eeeeffff3333;"
    let statsBeat: Statsbeat = null;

    beforeEach(() => {
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
    });

    describe("#Resource provider property", () => {
        it("unknown resource provider", (done) => {
            statsBeat["_getResourceProvider"](() => {
                assert.equal(statsBeat["_resourceProvider"], "unknown");
                assert.equal(statsBeat["_resourceIdentifier"], "unknown");
                done();
            });

        });

        it("app service", (done) => {
            var newEnv = <{ [id: string]: string }>{};
            newEnv["WEBSITE_SITE_NAME"] = "Test Website";
            newEnv["WEBSITE_HOME_STAMPNAME"] = "test_home";
            var originalEnv = process.env;
            process.env = newEnv;
            statsBeat["_getResourceProvider"](() => {
                process.env = originalEnv;
                assert.equal(statsBeat["_resourceProvider"], "appsvc");
                assert.equal(statsBeat["_resourceIdentifier"], "Test Website/test_home");
                done();
            });

        });

        it("Azure Function", (done) => {
            var newEnv = <{ [id: string]: string }>{};
            newEnv["FUNCTIONS_WORKER_RUNTIME"] = "test";
            newEnv["WEBSITE_HOSTNAME"] = "test_host";
            var originalEnv = process.env;
            process.env = newEnv;
            statsBeat["_getResourceProvider"](() => {
                process.env = originalEnv;
                assert.equal(statsBeat["_resourceProvider"], "functions");
                assert.equal(statsBeat["_resourceIdentifier"], "test_host");
                done();
            });
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
            statsBeat["_getResourceProvider"](() => {
                process.env = originalEnv;
                assert.equal(statsBeat["_resourceProvider"], "vm");
                assert.equal(statsBeat["_resourceIdentifier"], "testId/testsubscriptionId");
                assert.equal(statsBeat["_os"], "testOsType");
                done();
            });
        });
    });

    describe("#trackStatbeats", () => {
        it("It adds correct network properties to custom metric", (done) => {
            statsBeat["_longHandle"] = setInterval(() => { }, 0); // Prevent long interval metrics to be send
            statsBeat.enable(true);
            const sendStub = sandbox.stub(statsBeat, "_sendStatsbeats");
            statsBeat.countRequest(1, "testEndpointHost", 123, true);
            statsBeat.setCodelessAttach();
            statsBeat.trackShortIntervalStatsbeats().then(() => {
                assert.ok(sendStub.called, "should call _sendStatsbeats");
                let requestDurationMetric = statsBeat["_statbeatMetrics"][0];
                assert.equal(requestDurationMetric.name, "Request Duration");
                assert.equal(requestDurationMetric.value, 123);
                assert.equal((<any>(requestDurationMetric.properties))["attach"], "codeless");
                assert.equal((<any>(requestDurationMetric.properties))["cikey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert.equal((<any>(requestDurationMetric.properties))["language"], "node");
                assert.equal((<any>(requestDurationMetric.properties))["rp"], "unknown");
                assert.equal((<any>(requestDurationMetric.properties))["endpoint"], 1);
                assert.equal((<any>(requestDurationMetric.properties))["host"], "testEndpointHost");
                assert.ok((<any>(requestDurationMetric.properties))["os"]);
                assert.ok((<any>(requestDurationMetric.properties))["runtimeVersion"]);
                assert.ok((<any>(requestDurationMetric.properties))["version"]);

                done();
            });
        });

        it("Track duration", (done) => {
            statsBeat["_longHandle"] = setInterval(() => { }, 0); // Prevent long interval metrics to be send
            statsBeat.enable(true);
            const sendStub = sandbox.stub(statsBeat, "_sendStatsbeats");
            statsBeat.countRequest(0, "test", 1000, true);
            statsBeat.countRequest(0, "test", 500, false);
            statsBeat.trackShortIntervalStatsbeats().then((error) => {
                assert.ok(sendStub.called, "should call _sendStatsbeats");
                let requestDurationMetric = statsBeat["_statbeatMetrics"][0];
                assert.equal(requestDurationMetric.name, "Request Duration");
                assert.equal(requestDurationMetric.value, 750);
                done();
            });
        });

        it("Track counts", (done) => {
            statsBeat["_longHandle"] = setInterval(() => { }, 0); // Prevent long interval metrics to be send
            statsBeat.enable(true);
            const sendStub = sandbox.stub(statsBeat, "_sendStatsbeats");
            statsBeat.countRequest(0, "test", 1, true);
            statsBeat.countRequest(0, "test", 1, true);
            statsBeat.countRequest(0, "test", 1, true);
            statsBeat.countRequest(0, "test", 1, true);
            statsBeat.countRequest(0, "test", 1, false);
            statsBeat.countRequest(0, "test", 1, false);
            statsBeat.countRequest(0, "test", 1, false);
            statsBeat.countRetry(0, "test");
            statsBeat.countRetry(0, "test");
            statsBeat.countThrottle(0, "test");
            statsBeat.countException(0, "test");
            statsBeat.trackShortIntervalStatsbeats().then(() => {
                assert.ok(sendStub.called, "should call _sendStatsbeats");
                let metric = statsBeat["_statbeatMetrics"][1];
                assert.equal(metric.name, "Request Success Count");
                assert.equal(metric.value, 4);
                metric = statsBeat["_statbeatMetrics"][2];
                assert.equal(metric.name, "Requests Failure Count");
                assert.equal(metric.value, 3);
                metric = statsBeat["_statbeatMetrics"][3];
                assert.equal(metric.name, "Retry Count");
                assert.equal(metric.value, 2);
                metric = statsBeat["_statbeatMetrics"][4];
                assert.equal(metric.name, "Throttle Count");
                assert.equal(metric.value, 1);
                metric = statsBeat["_statbeatMetrics"][5];
                assert.equal(metric.name, "Exception Count");
                assert.equal(metric.value, 1);
                done();
            });
        });

        it("Track attach Statbeat", (done) => {
            statsBeat["_longHandle"] = setInterval(() => { }, 0); // Prevent long interval metrics to be send
            statsBeat.enable(true);
            const spy = sandbox.spy(statsBeat["_sender"], "send");
            statsBeat.trackLongIntervalStatsbeats().then(() => {
                let envelope = spy.args[0][0][0];
                let baseData: Contracts.MetricData = envelope.data.baseData;
                assert.equal(baseData.metrics[0].name, "Attach");
                assert.equal(baseData.metrics[0].value, 1);
                assert.equal(baseData.properties["cikey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert.equal(baseData.properties["language"], "node");
                assert.equal(baseData.properties["rp"], "unknown");
                assert.equal(baseData.properties["rpId"], "unknown");
                assert.equal(baseData.properties["attach"], "sdk");
                assert.ok(baseData.properties["os"]);
                assert.ok(baseData.properties["runtimeVersion"]);
                assert.ok(baseData.properties["version"]);
                done();
            })
        });

        it("Track feature Statbeat", (done) => {
            statsBeat["_longHandle"] = setInterval(() => { }, 0); // Prevent long interval metrics to be send
            statsBeat.enable(true);
            statsBeat.addFeature(Constants.StatsbeatFeature.DISK_RETRY);
            const spy = sandbox.spy(statsBeat["_sender"], "send");
            statsBeat.trackLongIntervalStatsbeats().then(() => {
                let envelope = spy.args[0][0][1];
                let baseData: Contracts.MetricData = envelope.data.baseData;
                assert.equal(baseData.metrics[0].name, "Feature");
                assert.equal(baseData.metrics[0].value, 1);
                assert.equal(baseData.properties["type"], 0);
                assert.equal(baseData.properties["cikey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert.equal(baseData.properties["language"], "node");
                assert.equal(baseData.properties["rp"], "unknown");
                assert.equal(baseData.properties["attach"], "sdk");
                assert.equal(baseData.properties["feature"], 1);
                assert.ok(baseData.properties["os"]);
                assert.ok(baseData.properties["runtimeVersion"]);
                assert.ok(baseData.properties["version"]);
                done();
            })
        });

        it("Track instrumentation Statbeat", (done) => {
            statsBeat["_longHandle"] = setInterval(() => { }, 0); // Prevent long interval metrics to be send
            statsBeat.enable(true);
            statsBeat.addInstrumentation(Constants.StatsbeatInstrumentation.AZURE_CORE_TRACING);
            const spy = sandbox.spy(statsBeat["_sender"], "send");
            statsBeat.trackLongIntervalStatsbeats().then(() => {
                let envelope = spy.args[0][0][1];
                let baseData: Contracts.MetricData = envelope.data.baseData;
                assert.equal(baseData.metrics[0].name, "Feature");
                assert.equal(baseData.metrics[0].value, 1);
                assert.equal(baseData.properties["type"], 1);
                assert.equal(baseData.properties["cikey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert.equal(baseData.properties["language"], "node");
                assert.equal(baseData.properties["rp"], "unknown");
                assert.equal(baseData.properties["attach"], "sdk");
                assert.equal(baseData.properties["feature"], 1);
                assert.ok(baseData.properties["os"]);
                assert.ok(baseData.properties["runtimeVersion"]);
                assert.ok(baseData.properties["version"]);
                done();
            })
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
            statsBeat["_longHandle"] = setInterval(() => { }, 0); // Prevent long interval metrics to be send
            statsBeat.enable(true);
            const sendStub = sandbox.stub(statsBeat["_sender"], "send");
            statsBeat.countRequest(0, "breezeFirstEndpoint", 100, true);
            statsBeat.countRequest(1, "quickpulseEndpoint", 200, true);
            statsBeat.countRequest(0, "breezeSecondEndpoint", 400, true);
            statsBeat.trackShortIntervalStatsbeats().then(() => {
                assert.equal(sendStub.callCount, 1, "should call sender");
                let envelope = sendStub.args[0][0][0];
                let baseData: Contracts.MetricData = envelope.data.baseData;
                assert.equal(baseData.metrics[0].name, "Request Duration");
                assert.equal(baseData.metrics[0].value, 100);
                assert.equal(baseData.properties["endpoint"], 0);
                assert.equal(baseData.properties["host"], "breezeFirstEndpoint");
                envelope = sendStub.args[0][0][1];
                baseData = envelope.data.baseData;
                assert.equal(baseData.metrics[0].name, "Request Duration");
                assert.equal(baseData.metrics[0].value, 200);
                assert.equal(baseData.properties["endpoint"], 1);
                assert.equal(baseData.properties["host"], "quickpulseEndpoint");
                envelope = sendStub.args[0][0][2];
                baseData = envelope.data.baseData;
                assert.equal(baseData.metrics[0].name, "Request Duration");
                assert.equal(baseData.metrics[0].value, 400);
                assert.equal(baseData.properties["endpoint"], 0);
                assert.equal(baseData.properties["host"], "breezeSecondEndpoint");
                done();
            });
        });
    });
});