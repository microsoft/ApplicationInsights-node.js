import assert = require("assert");
import sinon = require("sinon");
import os = require("os");

import AppInsights = require("../../applicationinsights");
import HeartBeat = require("../../AutoCollection/HeartBeat");
import TelemetryClient = require("../../Library/TelemetryClient");
import Context = require("../../Library/Context");

import { stub } from "sinon";
import * as nock from 'nock';
import Util = require("../../Library/Util");

describe("AutoCollection/HeartBeat", () => {
    const client = new TelemetryClient("key");
    client.config.correlationId = "testicd";
    let heartbeat1: HeartBeat;
    let stub1: any;
    beforeEach(() => {
        heartbeat1 = new HeartBeat(client);
        heartbeat1.enable(true, client.config);
        HeartBeat.INSTANCE.enable(true, client.config);
        stub1 = sinon.stub(heartbeat1["_client"], "trackMetric");
    });

    afterEach(() => {
        AppInsights.dispose();
        stub1.restore();
        heartbeat1.dispose();
    });

    after(() => {
        nock.cleanAll();
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
        it("should read correct values from envrionment variable", () => {
            var env1 = <{[id: string]: string}>{};
            var env2 = <{[id: string]: string}>{};

            env1["WEBSITE_SITE_NAME"] = "site_name";
            env1[ "WEBSITE_HOME_STAMPNAME"] = "stamp_name";
            env1["WEBSITE_HOSTNAME"] = "host_name";
            
            env2["FUNCTIONS_WORKER_RUNTIME"] = "nodejs";
            env2["WEBSITE_HOSTNAME"] = "host_name";

            var originalEnv = process.env;
            process.env = env1;

            heartbeat1["trackHeartBeat"](client.config);
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
            heartbeat1["trackHeartBeat"](client.config);
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

        it("should get virtual machine information from response", () => {
            nock.disableNetConnect();
            const requestURL = "http://169.254.169.254";
            const scope = nock(requestURL)
                .persist()
                .get('/metadata/instance/compute?api-version=2017-12-01&format=json', {headers: {"Metadata": "true"}})
                .reply(
                    200,
                    {
                        'vmId': 1,
                        'subscriptionId': 2,
                        'osType': 'Linux'
                    }
                );
            heartbeat1["trackHeartBeat"](client.config);
            //stub1 = sinon.stub(heartbeat1, "_getAzureComputeMetadata").callsFake(() => { heartbeat1["_vmData"] return true}) ;
            assert.equal(stub1.callCount, 1, "calls trackMetric for the appSrv heartbeat metric");
            assert.equal(stub1.args[0][0].name, "HeartBeat", "uses correct name for heartbeat metric");
            assert.equal(stub1.args[0][0].value, 0, "checks value is 0");
            const keys3 = Object.keys(stub1.args[0][0].properties);
            assert.equal(keys3.length, 4, "makes sure 4 kv pairs are added when resource type is VM");
            assert.equal(keys3[0], "sdk", "sdk is added as a key");
            assert.equal(keys3[1], "azInst_vmId",  "azInst_vmId is added as a key");
            assert.equal(keys3[2], "azInst_subscriptionId", "azInst_subscriptionId is added as a key");
            assert.equal(keys3[3], "azInst_osType", "azInst_osType is added as a key");

            const properties3 = stub1.args[0][0].properties;
            assert.equal(properties3["sdk"], Context.sdkVersion, "sdk version is read from Context");
            assert.equal(properties3["azInst_vmId"], 1, "azInst_vmId is read from response");
            assert.equal(properties3["azInst_subscriptionId"], 2, "azInst_subscriptionId is read from response");
            assert.equal(properties3["azInst_osType"], "Linux", "azInst_osType is read from response");
        });
    });
});
