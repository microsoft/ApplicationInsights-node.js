import assert = require("assert");
import sinon = require("sinon");
import os = require("os");

import AppInsights = require("../../applicationinsights");
import HeartBeat = require("../../AutoCollection/HeartBeat");
import TelemetryClient = require("../../Library/TelemetryClient");
import Context = require("../../Library/Context");
import { JsonConfig } from "../../Library/JsonConfig";

describe("AutoCollection/HeartBeat", () => {
    var sandbox: sinon.SinonSandbox;
    let originalEnv: NodeJS.ProcessEnv;
    const client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
    client.config.correlationId = "testicd";

    beforeEach(() => {
        originalEnv = process.env;
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        process.env = originalEnv;
        AppInsights.dispose();
        sandbox.restore();
    });

    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop autocollection interval", () => {
            JsonConfig["_instance"] = undefined;
            var env = <{ [id: string]: string }>{};
            env["APPLICATION_INSIGHTS_NO_STATSBEAT"] = "true";
            process.env = env;
            var setIntervalSpy = sandbox.spy(global, "setInterval");
            var clearIntervalSpy = sandbox.spy(global, "clearInterval");
            AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333")
                .setAutoCollectPreAggregatedMetrics(false)
                .setAutoCollectPerformance(false, false)
                .setAutoCollectHeartbeat(true)
                .start();
            assert.equal(setIntervalSpy.callCount, 1, "setInterval should be called as part of heartbeat initialization");
            AppInsights.dispose();
            assert.equal(clearIntervalSpy.callCount, 1, "clearInterval should be called once as part of heartbeat shutdown");
        });
    });

    describe("#trackHeartBeat()", () => {
        it("should read correct web app values from envrionment variable", (done) => {
            const heartbeat1: HeartBeat = new HeartBeat(client);
            heartbeat1.enable(true);
            HeartBeat.INSTANCE.enable(true);
            const stub1 = sandbox.stub(heartbeat1["_client"], "trackMetric");

            var env1 = <{ [id: string]: string }>{};

            env1["WEBSITE_SITE_NAME"] = "site_name";
            env1["WEBSITE_HOME_STAMPNAME"] = "stamp_name";
            env1["WEBSITE_HOSTNAME"] = "host_name";
            env1["WEBSITE_OWNER_NAME"] = "owner_name";
            env1["WEBSITE_RESOURCE_GROUP"] = "resource_group";
            env1["WEBSITE_SLOT_NAME"] = "slot_name";
            process.env = env1;

            heartbeat1["trackHeartBeat"](client.config, () => {
                assert.equal(stub1.callCount, 1, "should call trackMetric for the appSrv heartbeat metric");
                assert.equal(stub1.args[0][0].name, "HeartbeatState", "should use correct name for heartbeat metric");
                assert.equal(stub1.args[0][0].value, 0, "value should be 0");
                const keys1 = Object.keys(stub1.args[0][0].properties);
                assert.equal(keys1.length, 10, "should have 5 kv pairs added when resource type is appSrv");
                assert.equal(keys1[0], "sdkVersion", "sdk should be added as a key");
                assert.equal(keys1[1], "osType", "osType should be added as a key");
                assert.equal(keys1[2], "osVersion", "osVersion should be added as a key");
                assert.equal(keys1[3], "processSessionId", "processSessionId should be added as a key");
                assert.equal(keys1[4], "appSrv_SiteName", "appSrv_SiteName should be added as a key");
                assert.equal(keys1[5], "appSrv_wsStamp", "appSrv_wsStamp should be added as a key");
                assert.equal(keys1[6], "appSrv_wsHost", "appSrv_wsHost should be added as a key");
                assert.equal(keys1[7], "appSrv_wsOwner", "appSrv_wsOwner should be added as a key");
                assert.equal(keys1[8], "appSrv_ResourceGroup", "appSrv_ResourceGroup should be added as a key");
                assert.equal(keys1[9], "appSrv_SlotName", "appSrv_SlotName should be added as a key");
                const properties1 = stub1.args[0][0].properties;
                assert.equal(properties1["sdkVersion"], Context.sdkVersion, "sdk version should be read from Context");
                assert.equal(properties1["osType"], os.type(), "osType should be read from os library");
                assert.equal(properties1["osVersion"],  os.release(), "osVersion should be read from envrionment variable");
                assert.ok(properties1["processSessionId"], "processSessionId should be available");
                assert.equal(properties1["appSrv_SiteName"], "site_name", "appSrv_SiteName should be read from envrionment variable");
                assert.equal(properties1["appSrv_wsStamp"], "stamp_name", "appSrv_wsStamp should be read from envrionment variable");
                assert.equal(properties1["appSrv_wsHost"], "host_name", "appSrv_wsHost should be read from envrionment variable");
                assert.equal(properties1["appSrv_wsOwner"], "owner_name", "appSrv_wsOwner should be read from envrionment variable");
                assert.equal(properties1["appSrv_ResourceGroup"], "resource_group", "appSrv_ResourceGroup should be read from envrionment variable");
                assert.equal(properties1["appSrv_SlotName"], "slot_name", "appSrv_SlotName should be read from envrionment variable");
                done();
            });
        });
    });
});