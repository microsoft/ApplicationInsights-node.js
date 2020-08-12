import assert = require("assert");
import sinon = require("sinon");
import os = require("os");

import AppInsights = require("../../applicationinsights");
import HeartBeat = require("../../AutoCollection/HeartBeat");
import TelemetryClient = require("../../Library/TelemetryClient");
import Context = require("../../Library/Context");

describe("AutoCollection/HeartBeat", () => {
    const client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
    client.config.correlationId = "testicd";

    afterEach(() => {
        AppInsights.dispose();
    });

    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop autocollection interval", () => {
            var setIntervalSpy = sinon.spy(global, "setInterval");
            var clearIntervalSpy = sinon.spy(global, "clearInterval");
            AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333")
                .setAutoCollectPerformance(false, false)
                .setAutoCollectHeartbeat(true)
                .start();
            assert.equal(setIntervalSpy.callCount, 1, "setInteval should be called once as part of heartbeat initialization");
            AppInsights.dispose();
            assert.equal(clearIntervalSpy.callCount, 1, "clearInterval should be called once as part of heartbeat shutdown");

            setIntervalSpy.restore();
            clearIntervalSpy.restore();
        });
    });

    describe("#trackHeartBeat()", () => {
        it("should read correct web app values from envrionment variable", (done) => {
            const heartbeat1: HeartBeat = new HeartBeat(client);
            heartbeat1.enable(true, client.config);
            HeartBeat.INSTANCE.enable(true, client.config);
            const stub1 = sinon.stub(heartbeat1["_client"], "trackMetric");

            var env1 = <{[id: string]: string}>{};

            env1["WEBSITE_SITE_NAME"] = "site_name";
            env1[ "WEBSITE_HOME_STAMPNAME"] = "stamp_name";
            env1["WEBSITE_HOSTNAME"] = "host_name";

            var originalEnv = process.env;
            process.env = env1;

            heartbeat1["trackHeartBeat"](client.config, () => {
                assert.equal(stub1.callCount, 1, "should call trackMetric for the appSrv heartbeat metric");
                assert.equal(stub1.args[0][0].name, "HeartBeat", "should use correct name for heartbeat metric");
                assert.equal(stub1.args[0][0].value, 0, "value should be 0");
                const keys1 = Object.keys(stub1.args[0][0].properties);
                assert.equal(keys1.length, 5, "should have 5 kv pairs added when resource type is appSrv");
                assert.equal(keys1[0], "sdk", "sdk should be added as a key");
                assert.equal(keys1[1], "osType", "osType should be added as a key");
                assert.equal(keys1[2], "appSrv_SiteName", "appSrv_SiteName should be added as a key");
                assert.equal(keys1[3], "appSrv_wsStamp", "appSrv_wsStamp should be added as a key");
                assert.equal(keys1[4], "appSrv_wsHost", "appSrv_wsHost should be added as a key");
                const properties1 = stub1.args[0][0].properties;
                assert.equal(properties1["sdk"], Context.sdkVersion, "sdk version should be read from Context");
                assert.equal(properties1["osType"], os.type(), "osType should be read from os library");
                assert.equal(properties1["appSrv_SiteName"], "site_name", "appSrv_SiteName should be read from envrionment variable");
                assert.equal(properties1["appSrv_wsStamp"], "stamp_name", "appSrv_wsStamp should be read from envrionment variable");
                assert.equal(properties1["appSrv_wsHost"], "host_name", "appSrv_wsHost should be read from envrionment variable");

                stub1.restore();
                heartbeat1.dispose();
                process.env = originalEnv;
                done();
            });
        });

        it("should read correct function app values from envrionment variable", (done) => {
            const heartbeat2: HeartBeat = new HeartBeat(client);
            heartbeat2.enable(true, client.config);
            HeartBeat.INSTANCE.enable(true, client.config);
            const stub2 = sinon.stub(heartbeat2["_client"], "trackMetric");

            var env2 = <{[id: string]: string}>{};
            
            env2["FUNCTIONS_WORKER_RUNTIME"] = "nodejs";
            env2["WEBSITE_HOSTNAME"] = "host_name";

            var originalEnv = process.env;
            process.env = env2;
        
            heartbeat2["trackHeartBeat"](client.config, () => {
                assert.equal(stub2.callCount, 1, "should call trackMetric for the VM heartbeat metric");
                assert.equal(stub2.args[0][0].name, "HeartBeat", "should use correct name for heartbeat metric");
                assert.equal(stub2.args[0][0].value, 0, "value should be 0");
                const keys2 = Object.keys(stub2.args[0][0].properties);
                assert.equal(keys2.length, 3, "should have 3 kv pairs added when resource type is functiona app");
                assert.equal(keys2[0], "sdk", "sdk should be added as a key");
                assert.equal(keys2[1], "osType",  "osType should be added as a key");
                assert.equal(keys2[2], "azfunction_appId", "azfunction_appId should be added as a key");
                const properties2 = stub2.args[0][0].properties;
                assert.equal(properties2["sdk"], Context.sdkVersion, "sdk version should be read from Context");
                assert.equal(properties2["osType"], os.type(), "osType should be read from os library");
                assert.equal(properties2["azfunction_appId"], "host_name", "azfunction_appId should be read from envrionment variable");

                process.env = originalEnv;
                stub2.restore();
                heartbeat2.dispose();
                done();
            });
        });
    });
});