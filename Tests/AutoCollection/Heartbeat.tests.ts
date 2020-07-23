import assert = require("assert");
import sinon = require("sinon");
import os = require("os");

import AppInsights = require("../../applicationinsights");
import HeartBeat = require("../../AutoCollection/HeartBeat");
import TelemetryClient = require("../../Library/TelemetryClient");
import { stub } from "sinon";

describe("AutoCollection/HeartBeat", () => {
    afterEach(() => {
        AppInsights.dispose();
    });
    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop autocollection interval", () => {
            var setIntervalSpy = sinon.spy(global, "setInterval");
            var clearIntervalSpy = sinon.spy(global, "clearInterval");
            AppInsights.setup("key").setAutoCollectHeartbeat(true).start();
            assert.equal(setIntervalSpy.callCount, 1, "setInteval should be called once as part of heartbeat initialization");
            AppInsights.dispose();
            assert.equal(clearIntervalSpy.callCount, 1, "clearInterval should be called once as part of heartbeat shutdown");

            setIntervalSpy.restore();
            clearIntervalSpy.restore();
        });
    });

    describe("#trackHeartBeat()", () => {
        it("should read correct values from envrionment", () => {
            const heartbeat1 = new HeartBeat(new TelemetryClient("key"));
            const heartbeat2 = new HeartBeat(new TelemetryClient("key"));
            heartbeat1.enable(true);
            heartbeat2.enable(true);
            HeartBeat.INSTANCE.enable(true);
            const stub1 = sinon.stub(heartbeat1["_client"], "trackMetric");
            const stub2 = sinon.stub(heartbeat1["_client"], "trackMetric");


            var env1 = <{[id: string]: string}>{};
            var env2 = <{[id: string]: string}>{};

            env1["WEBSITE_SITE_NAME"] = "site_name";
            env1[ "WEBSITE_HOME_STAMPNAME"] = "stamp_name";
            env1["WEBSITE_HOSTNAME"] = "host_name";
            
            env2["FUNCTIONS_WORKER_RUNTIME"] = "nodejs";

            var originalEnv = process.env;
            process.env = env1;

            heartbeat1["trackHeartBeat"]();
            assert.equal(stub1.callCount, 1, "calls trackMetric for the appSrv heartbeat metric");
            assert.equal(stub1.args[1][0].name, "HeartBeat");
            assert.equal(stub1.args[1][0].value, 0); // question: what should the value be here?
            const keys1 = Object.keys(stub1.args[1][0].properties);
            assert.equal(keys1.length, 4); // need to update this to 5 after adding "sdk" kv pair
            // assert.equal(keys1[0], "sdk"); // need to add this as above
            assert.equal(keys1[0], "osType"); // need to update this to 1
            assert.equal(keys1[1], "appSrv_SiteName");
            assert.equal(keys1[2], "appSrv_wsStamp");
            assert.equal(keys1[3], "appSrv_wsHost");
            const properties1 = stub1.args[1][0].properties;
            properties1["osType"] = os.type();
            properties1["appSrv_SiteName"] = "site_name";
            properties1["appSrv_wsStamp"] = "stamp_name";
            properties1["appSrv_wsHost"] = "host_name";

            process.env = env2;
            heartbeat2["trackHeartBeat"]();
            assert.equal(stub2.callCount, 1, "calls trackMetric for the functionApp heartbeat metric");
            assert.equal(stub2.args[1][0].name, "HeartBeat");
            assert.equal(stub2.args[1][0].value, 0); // question: what should the value be here?
            const keys2 = Object.keys(stub1.args[1][0].properties);
            assert.equal(keys2.length, 2); // need to update this to 3 after adding "sdk" kv pair
            // assert.equal(keys2[0], "sdk"); // need to add this as above
            assert.equal(keys2[0], "osType"); // need to update this to 1
            assert.equal(keys2[1], "azfunction_appId");
            const properties2 = stub2.args[1][0].properties;
            properties2["osType"] = os.type();
            properties2["azfunction_appId"] = "nodejs";

            process.env = originalEnv;
        });
    });
});
