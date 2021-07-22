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

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
        AppInsights.dispose();
    });

    after(() => {
        nock.cleanAll();
    });

    describe("#init and #disable()", () => {
        it("init should enable and dispose should stop autocollection interval", () => {
            var setIntervalSpy = sandbox.spy(global, "setInterval");
            var clearIntervalSpy = sandbox.spy(global, "clearInterval");
            let client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            assert.equal(setIntervalSpy.callCount, 1, "setInterval should be called once as part of Statsbeat initialization");
            client.getStatsbeat().enable(false);
            assert.equal(clearIntervalSpy.callCount, 1, "clearInterval should be called once as part of Statsbeat disable");
        });
    });

    describe("#Resource provider property", () => {
        it("unknown resource provider", (done) => {
            const statsBeat: Statsbeat = new Statsbeat(config);
            statsBeat["_getResourceProvider"](() => {
                assert.equal(statsBeat["_resourceProvider"], "unknown");
                done();
            });

        });

        it("app service", (done) => {
            const statsBeat: Statsbeat = new Statsbeat(config);
            var newEnv = <{ [id: string]: string }>{};
            newEnv["WEBSITE_SITE_NAME"] = "Test Website";
            var originalEnv = process.env;
            process.env = newEnv;
            statsBeat["_getResourceProvider"](() => {
                process.env = originalEnv;
                assert.equal(statsBeat["_resourceProvider"], "appsvc");
                done();
            });

        });

        it("Azure Function", (done) => {
            const statsBeat: Statsbeat = new Statsbeat(config);
            var newEnv = <{ [id: string]: string }>{};
            newEnv["FUNCTIONS_WORKER_RUNTIME"] = "nodejs";
            var originalEnv = process.env;
            process.env = newEnv;
            statsBeat["_getResourceProvider"](() => {
                process.env = originalEnv;
                assert.equal(statsBeat["_resourceProvider"], "function");
                done();
            });
        });

        it("Azure VM", (done) => {
            const statsBeat: Statsbeat = new Statsbeat(config);
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
                done();
            });
        });
    });

    describe("#trackStatsbeatMetrics", () => {
        it("It adds correct properties to custom metric", (done) => {
            const statsBeat: Statsbeat = new Statsbeat(config);
            statsBeat.enable(true);
            const spy = sandbox.spy(statsBeat["_sender"], "send");
            statsBeat.countRequest(123, true);
            statsBeat.trackStatsbeatMetrics().then(() => {
                assert.equal(spy.callCount, 1, "should call sender");
                let envelope = spy.args[0][0][0];
                assert.equal(envelope.name, "Statsbeat");
                assert.equal(envelope.iKey, "c4a29126-a7cb-47e5-b348-11414998b11e");
                assert.equal(envelope.data.baseType, "MetricData");
                let baseData: Contracts.MetricData = envelope.data.baseData;
                assert.equal(baseData.properties["attach"], "sdk");
                assert.equal(baseData.properties["cikey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert.equal(baseData.properties["feature"], 0);
                assert.equal(baseData.properties["instrumentation"], 0);
                assert.equal(baseData.properties["language"], "node");
                assert.equal(baseData.properties["rp"], "unknown");
                assert.ok(baseData.properties["os"]);
                assert.ok(baseData.properties["runtimeVersion"]);
                assert.ok(baseData.properties["version"]);
                statsBeat.enable(false);
                done();
            });
        });

        it("Track duration", (done) => {
            const statsBeat: Statsbeat = new Statsbeat(config);
            statsBeat.enable(true);
            const spy = sandbox.spy(statsBeat["_sender"], "send");
            statsBeat.countRequest(1000, true);
            statsBeat.countRequest(500, false);
            statsBeat.trackStatsbeatMetrics().then(() => {
                assert.equal(spy.callCount, 1, "should call sender");
                let envelope = spy.args[0][0][0];
                let baseData: Contracts.MetricData = envelope.data.baseData;
                assert.equal(baseData.metrics[0].name, "Request Duration");
                assert.equal(baseData.metrics[0].value, 750);
                statsBeat.enable(false);
                done();
            });
        });

        it("Track counts", (done) => {
            const statsBeat: Statsbeat = new Statsbeat(config);
            statsBeat.enable(true);
            const spy = sandbox.spy(statsBeat["_sender"], "send");
            statsBeat.countRequest(1, true);
            statsBeat.countRequest(1, true);
            statsBeat.countRequest(1, true);
            statsBeat.countRequest(1, true);
            statsBeat.countRequest(1, false);
            statsBeat.countRequest(1, false);
            statsBeat.countRequest(1, false);
            statsBeat.countRetry();
            statsBeat.countRetry();
            statsBeat.countThrottle();
            statsBeat.countException();
            statsBeat.trackStatsbeatMetrics().then(() => {
                assert.equal(spy.callCount, 1, "should call sender");
                let envelope = spy.args[0][0][1];
                let baseData: Contracts.MetricData = envelope.data.baseData;
                assert.equal(baseData.metrics[0].name, "Request Success Count");
                assert.equal(baseData.metrics[0].value, 4);
                envelope = spy.args[0][0][2];
                baseData = envelope.data.baseData;
                assert.equal(baseData.metrics[0].name, "Requests Failure Count");
                assert.equal(baseData.metrics[0].value, 3);
                envelope = spy.args[0][0][3];
                baseData = envelope.data.baseData;
                assert.equal(baseData.metrics[0].name, "Retry Count");
                assert.equal(baseData.metrics[0].value, 2);
                envelope = spy.args[0][0][4];
                baseData = envelope.data.baseData;
                assert.equal(baseData.metrics[0].name, "Throttle Count");
                assert.equal(baseData.metrics[0].value, 1);
                envelope = spy.args[0][0][5];
                baseData = envelope.data.baseData;
                assert.equal(baseData.metrics[0].name, "Exception Count");
                assert.equal(baseData.metrics[0].value, 1);
                statsBeat.enable(false);
                done();
            });
        });

        it("Instrumentations", () => {
            const statsBeat: Statsbeat = new Statsbeat(config);
            statsBeat.addInstrumentation(Constants.StatsbeatInstrumentation.AZURE_CORE_TRACING);
            assert.equal(statsBeat["_instrumentations"], 1);
            statsBeat.addInstrumentation(Constants.StatsbeatInstrumentation.MONGODB);
            assert.equal(statsBeat["_instrumentations"], 3);
            statsBeat.addInstrumentation(Constants.StatsbeatInstrumentation.MYSQL);
            assert.equal(statsBeat["_instrumentations"], 7);
            statsBeat.removeInstrumentation(Constants.StatsbeatInstrumentation.AZURE_CORE_TRACING);
            assert.equal(statsBeat["_instrumentations"], 6);
            statsBeat.removeInstrumentation(Constants.StatsbeatInstrumentation.MYSQL);
            assert.equal(statsBeat["_instrumentations"], 2);
        });

        it("Features", () => {
            const statsBeat: Statsbeat = new Statsbeat(config);
            statsBeat.addFeature(Constants.StatsbeatFeature.DISK_RETRY);
            assert.equal(statsBeat["_features"], 1);
            statsBeat.addFeature(Constants.StatsbeatFeature.AAD_HANDLING);
            assert.equal(statsBeat["_features"], 3);
            statsBeat.removeFeature(Constants.StatsbeatFeature.DISK_RETRY);
            assert.equal(statsBeat["_features"], 2);
        });
    });
});