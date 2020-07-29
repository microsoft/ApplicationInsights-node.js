import assert = require("assert");
import sinon = require("sinon");
import os = require("os");

import AppInsights = require("../../applicationinsights");
import HeartBeat = require("../../AutoCollection/HeartBeat");
import TelemetryClient = require("../../Library/TelemetryClient");
import Config = require("../../Library/Config");
import Context = require("../../Library/Context");

import { stub } from "sinon";

describe("AutoCollection/HeartBeat", () => {
    let heartbeat1: HeartBeat;
    let stub1: any;
    beforeEach(() => {
        heartbeat1 = new HeartBeat(new TelemetryClient("key"));
        heartbeat1.enable(true);
        HeartBeat.INSTANCE.enable(true);
        stub1 = sinon.stub(heartbeat1["_client"], "trackMetric");
    });

    afterEach(() => {
        AppInsights.dispose();
        stub1.restore();
        heartbeat1.dispose();
    });

    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop autocollection interval", () => {
            var setIntervalSpy = sinon.spy(global, "setInterval");
            var clearIntervalSpy = sinon.spy(global, "clearInterval");
            AppInsights.setup("key")
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
        it("should read correct values from envrionment", () => {
            const config = new Config("ikey");
            var env1 = <{[id: string]: string}>{};
            var env2 = <{[id: string]: string}>{};

            env1["WEBSITE_SITE_NAME"] = "site_name";
            env1[ "WEBSITE_HOME_STAMPNAME"] = "stamp_name";
            env1["WEBSITE_HOSTNAME"] = "host_name";
            
            env2["FUNCTIONS_WORKER_RUNTIME"] = "nodejs";
            env2["WEBSITE_HOSTNAME"] = "host_name";

            var originalEnv = process.env;
            process.env = env1;

            heartbeat1["trackHeartBeat"](config);
            assert.equal(stub1.callCount, 1, "calls trackMetric for the appSrv heartbeat metric");
            assert.equal(stub1.args[0][0].name, "HeartBeat", "uses correct name for heartbeat metric");
            assert.equal(stub1.args[0][0].value, 0, "checks value is 0");
            const keys1 = Object.keys(stub1.args[0][0].properties);
            assert.equal(keys1.length, 5, "makes sure 5 kv pairs are added when resource type is appSrv");
            assert.equal(keys1[0], "sdk", "sdk is added as a key");
            assert.equal(keys1[1], "osType", "osType is added as a key");
            assert.equal(keys1[2], "appSrv_SiteName", "appSrv_SiteName is added as a key");
            assert.equal(keys1[3], "appSrv_wsStamp", "appSrv_wsStamp is added as a key");
            assert.equal(keys1[4], "appSrv_wsHost", "appSrv_wsHost is added as a key");
            const properties1 = stub1.args[0][0].properties;
            assert.equal(properties1["sdk"], Context.sdkVersion, "sdk version is read from Context");
            assert.equal(properties1["osType"], os.type(), "osType is read from os library");
            assert.equal(properties1["appSrv_SiteName"], "site_name", "appSrv_SiteName is read from envrionment variable");
            assert.equal(properties1["appSrv_wsStamp"], "stamp_name", "appSrv_wsStamp is read from envrionment variable");
            assert.equal(properties1["appSrv_wsHost"], "host_name", "appSrv_wsHost is read from envrionment variable");

            process.env = env2;
            stub1.reset();
            heartbeat1["trackHeartBeat"](config);
            assert.equal(stub1.callCount, 1, "calls trackMetric for the functionApp heartbeat metric");
            assert.equal(stub1.args[0][0].name, "HeartBeat", "uses correct name for heartbeat metric");
            assert.equal(stub1.args[0][0].value, 0, "checks value is 0");
            const keys2 = Object.keys(stub1.args[0][0].properties);
            assert.equal(keys2.length, 3, "makes sure 3 kv pairs are added when resource type is functiona app");
            assert.equal(keys2[0], "sdk", "sdk is added as a key");
            assert.equal(keys2[1], "osType",  "osType is added as a key");
            assert.equal(keys2[2], "azfunction_appId", "azfunction_appId is added as a key");
            const properties2 = stub1.args[0][0].properties;
            assert.equal(properties2["sdk"], Context.sdkVersion, "sdk version is read from Context");
            assert.equal(properties2["osType"], os.type(), "osType is read from os library");
            assert.equal(properties2["azfunction_appId"], "host_name", "azfunction_appId is read from envrionment variable");

            process.env = originalEnv;
        });
    });
});
