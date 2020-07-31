import assert = require("assert");
import sinon = require("sinon");
import os = require("os");
import nock = require("nock");

import AppInsights = require("../../applicationinsights");
import HeartBeat = require("../../AutoCollection/HeartBeat");
import TelemetryClient = require("../../Library/TelemetryClient");
import Context = require("../../Library/Context");
import Util = require("../../Library/Util");

describe("AutoCollection/HeartBeat", () => {
    const client = new TelemetryClient("key");
    client.config.correlationId = "testicd";

    afterEach(() => {
        AppInsights.dispose();
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
                assert.equal(stub2.callCount, 1, "calls trackMetric for the VM heartbeat metric");
                assert.equal(stub2.args[0][0].name, "HeartBeat", "uses correct name for heartbeat metric");
                assert.equal(stub2.args[0][0].value, 0, "checks value is 0");
                const keys2 = Object.keys(stub2.args[0][0].properties);
                assert.equal(keys2.length, 3, "makes sure 3 kv pairs are added when resource type is functiona app");
                assert.equal(keys2[0], "sdk", "sdk is added as a key");
                assert.equal(keys2[1], "osType",  "osType is added as a key");
                assert.equal(keys2[2], "azfunction_appId", "azfunction_appId is added as a key");
                const properties2 = stub2.args[0][0].properties;
                assert.equal(properties2["sdk"], Context.sdkVersion, "sdk version is read from Context");
                assert.equal(properties2["osType"], os.type(), "osType is read from os library");
                assert.equal(properties2["azfunction_appId"], "host_name", "azfunction_appId is read from envrionment variable");

                process.env = originalEnv;
                stub2.restore();
                heartbeat2.dispose();
                done();
            });
        });

        it("should read correct VM information from response", (done) => {
            const heartbeat3: HeartBeat = new HeartBeat(client);
            heartbeat3.enable(true, client.config);
            HeartBeat.INSTANCE.enable(true, client.config);
            const stub3 = sinon.stub(heartbeat3["_client"], "trackMetric");
            const requestURL = "http://169.254.169.254"
            nock(requestURL, {
                reqheaders: {
                    "Metadata": "true"
                }
            })
            .get('/metadata/instance/compute?api-version=2017-12-01&format=json')
            .reply(
                200,
                {
                    'vmId': 1,
                    'subscriptionId': 2,
                    'osType': 'Linux'
                }
            );

            heartbeat3["trackHeartBeat"](client.config, () => {
                assert.equal(stub3.callCount, 1, "calls trackMetric for the VM heartbeat metric");
                assert.equal(stub3.args[0][0].name, "HeartBeat", "uses correct name for heartbeat metric");
                assert.equal(stub3.args[0][0].value, 0, "checks value is 0");
                const keys3 = Object.keys(stub3.args[0][0].properties);
                assert.equal(keys3.length, 4, "makes sure 4 kv pairs are added when resource type is VM");
                assert.equal(keys3[0], "sdk", "sdk is added as a key");
                assert.equal(keys3[1], "azInst_vmId",  "azInst_vmId is added as a key");
                assert.equal(keys3[2], "azInst_subscriptionId", "azInst_subscriptionId is added as a key");
                assert.equal(keys3[3], "azInst_osType", "azInst_osType is added as a key");

                const properties3 = stub3.args[0][0].properties;
                assert.equal(properties3["sdk"], Context.sdkVersion, "sdk version is read from Context");
                assert.equal(properties3["azInst_vmId"], 1, "azInst_vmId is read from response");
                assert.equal(properties3["azInst_subscriptionId"], 2, "azInst_subscriptionId is read from response");
                assert.equal(properties3["azInst_osType"], "Linux", "azInst_osType is read from response");

                stub3.restore();
                heartbeat3.dispose();
                done();
            });
        });

        it("should read correct VM information from response", (done) => {
            const heartbeat4: HeartBeat = new HeartBeat(client);
            heartbeat4.enable(true, client.config);
            HeartBeat.INSTANCE.enable(true, client.config);
            const stub4 = sinon.stub(heartbeat4["_client"], "trackMetric");

            heartbeat4["_vmData"] = {
                vmId: "1",
                subscriptionId: "2",
                osType: "Linux"
            };
            heartbeat4["_isVM"] = true;
            // sinon.stub(Util, "makeRequest").returns(new fakeResponse(false));
            sinon.stub(Util, 'makeRequest', (config: any, requestUrl: string, requestOptions: any, requestCallback: Function) => {
                process.nextTick(requestCallback);
                return new fakeResponse(false);
            });
            heartbeat4["trackHeartBeat"](client.config, () => {
                assert.equal(stub4.callCount, 1, "calls trackMetric for the VM heartbeat metric");
                assert.equal(stub4.args[0][0].name, "HeartBeat", "uses correct name for heartbeat metric");
                assert.equal(stub4.args[0][0].value, 0, "checks value is 0");
                const keys4 = Object.keys(stub4.args[0][0].properties);
                assert.equal(keys4.length, 4, "makes sure 4 kv pairs are added when resource type is VM");
                assert.equal(keys4[0], "sdk", "sdk is added as a key");
                assert.equal(keys4[1], "azInst_vmId",  "azInst_vmId is added as a key");
                assert.equal(keys4[2], "azInst_subscriptionId", "azInst_subscriptionId is added as a key");
                assert.equal(keys4[3], "azInst_osType", "azInst_osType is added as a key");

                const properties4 = stub4.args[0][0].properties;
                assert.equal(properties4["sdk"], Context.sdkVersion, "sdk version is read from Context");
                assert.equal(properties4["azInst_vmId"], 1, "azInst_vmId is read from response");
                assert.equal(properties4["azInst_subscriptionId"], 2, "azInst_subscriptionId is read from response");
                assert.equal(properties4["azInst_osType"], "Linux", "azInst_osType is read from response");

                stub4.restore();
                heartbeat4.dispose();
                done();
            });
        });
    });
});

/**
 * A fake response class that passes by default
 */
class fakeResponse {
    private callbacks: { [event: string]: (data?: any) => void } = Object.create(null);
    public setEncoding(): void { };
    public statusCode: number = 200;

    constructor(private passImmediately: boolean = true) { }

    public on(event: string, callback: () => void) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = callback;
        } else {
            var lastCallback = this.callbacks[event];
            this.callbacks[event] = () => {
                callback();
                lastCallback();
            };
        }

        if (event == "end" && this.passImmediately) {
            this.pass(true);
        }
    }

    public emit(eventName: string, ...args: any[]): boolean {
        return true;
    }

    public addListener(eventName: string, listener: () => void): void {
        this.on(eventName, listener);
    }

    public removeListener(eventName: string, listener: () => void) {

    }

    public pass(test = false): void {
        this.callbacks["data"] ? this.callbacks["data"]("data") : null;
        this.callbacks["end"] ? this.callbacks["end"]() : null;
        this.callbacks["finish"] ? this.callbacks["finish"]() : null;
    }

    public end = this.pass;
    public once = this.on;
}