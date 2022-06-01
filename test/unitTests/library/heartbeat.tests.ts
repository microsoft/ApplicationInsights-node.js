import * as assert from "assert";
import * as sinon from "sinon";
import * as os from "os";

import { Client } from "../../../src/library/client";
import { HeartBeat } from "../../../src/library/heartBeat";
import { Config, JsonConfig } from "../../../src/library/configuration";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

describe("AutoCollection/HeartBeat", () => {
    var sandbox: sinon.SinonSandbox;
    let originalEnv: NodeJS.ProcessEnv;
    const client = new Client(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
    client.getConfig().correlationId = "testicd";

    beforeEach(() => {
        originalEnv = process.env;
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        process.env = originalEnv;
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
            const heartbeat: HeartBeat = new HeartBeat(client.getMetricHandler(), client.getConfig());
            heartbeat.enable(true);

            assert.equal(
                setIntervalSpy.callCount,
                1,
                "setInterval should be called as part of heartbeat initialization"
            );
            heartbeat.enable(false);
            assert.equal(
                clearIntervalSpy.callCount,
                1,
                "clearInterval should be called once as part of heartbeat shutdown"
            );
        });
    });

    describe("#trackHeartBeat()", () => {
        it("should read correct web app values from envrionment variable", (done) => {
            const heartbeat1: HeartBeat = new HeartBeat(client.getMetricHandler(), client.getConfig());
            heartbeat1.enable(true);
            const stub1 = sandbox.stub(heartbeat1["_handler"], "trackMetric");

            var env1 = <{ [id: string]: string }>{};

            env1["WEBSITE_SITE_NAME"] = "site_name";
            env1["WEBSITE_HOME_STAMPNAME"] = "stamp_name";
            env1["WEBSITE_HOSTNAME"] = "host_name";
            process.env = env1;

            heartbeat1["trackHeartBeat"](client.getConfig(), () => {
                assert.equal(
                    stub1.callCount,
                    1,
                    "should call trackMetric for the appSrv heartbeat metric"
                );
                assert.equal(
                    stub1.args[0][0].metrics[0].name,
                    "HeartBeat",
                    "should use correct name for heartbeat metric"
                );
                assert.equal(stub1.args[0][0].metrics[0].value, 0, "value should be 0");
                const keys1 = Object.keys(stub1.args[0][0].properties);
                assert.equal(
                    keys1.length,
                    5,
                    "should have 5 kv pairs added when resource type is appSrv"
                );
                assert.equal(keys1[0], "sdk", "sdk should be added as a key");
                assert.equal(keys1[1], "osType", "osType should be added as a key");
                assert.equal(
                    keys1[2],
                    "appSrv_SiteName",
                    "appSrv_SiteName should be added as a key"
                );
                assert.equal(keys1[3], "appSrv_wsStamp", "appSrv_wsStamp should be added as a key");
                assert.equal(keys1[4], "appSrv_wsHost", "appSrv_wsHost should be added as a key");
                const properties1 = stub1.args[0][0].properties;
                assert.equal(
                    properties1["sdk"],
                    heartbeat1["_handler"].getResourceManager().getMetricResource().attributes[SemanticResourceAttributes.TELEMETRY_SDK_VERSION],
                    "sdk version should be read from Context"
                );
                assert.equal(
                    properties1["osType"],
                    os.type(),
                    "osType should be read from os library"
                );
                assert.equal(
                    properties1["appSrv_SiteName"],
                    "site_name",
                    "appSrv_SiteName should be read from environment variable"
                );
                assert.equal(
                    properties1["appSrv_wsStamp"],
                    "stamp_name",
                    "appSrv_wsStamp should be read from environment variable"
                );
                assert.equal(
                    properties1["appSrv_wsHost"],
                    "host_name",
                    "appSrv_wsHost should be read from environment variable"
                );
                done();
            });
        });

        it("should read correct function app values from environment variable", (done) => {
            const heartbeat2: HeartBeat = new HeartBeat(client.getMetricHandler(), client.getConfig());
            heartbeat2.enable(true);
            const stub2 = sandbox.stub(heartbeat2["_handler"], "trackMetric");
            var env2 = <{ [id: string]: string }>{};
            env2["FUNCTIONS_WORKER_RUNTIME"] = "nodejs";
            env2["WEBSITE_HOSTNAME"] = "host_name";
            process.env = env2;

            heartbeat2["trackHeartBeat"](client.getConfig(), () => {
                assert.equal(
                    stub2.callCount,
                    1,
                    "should call trackMetric for the VM heartbeat metric"
                );
                assert.equal(
                    stub2.args[0][0].metrics[0].name,
                    "HeartBeat",
                    "should use correct name for heartbeat metric"
                );
                assert.equal(stub2.args[0][0].metrics[0].value, 0, "value should be 0");
                const keys2 = Object.keys(stub2.args[0][0].properties);
                assert.equal(
                    keys2.length,
                    3,
                    "should have 3 kv pairs added when resource type is function app"
                );
                assert.equal(keys2[0], "sdk", "sdk should be added as a key");
                assert.equal(keys2[1], "osType", "osType should be added as a key");
                assert.equal(
                    keys2[2],
                    "azfunction_appId",
                    "azfunction_appId should be added as a key"
                );
                const properties2 = stub2.args[0][0].properties;
                assert.equal(
                    properties2["sdk"],
                    heartbeat2["_handler"].getResourceManager().getMetricResource().attributes[SemanticResourceAttributes.TELEMETRY_SDK_VERSION],
                    "sdk version should be read from Context"
                );
                assert.equal(
                    properties2["osType"],
                    os.type(),
                    "osType should be read from os library"
                );
                assert.equal(
                    properties2["azfunction_appId"],
                    "host_name",
                    "azfunction_appId should be read from environment variable"
                );
                done();
            });
        });
    });
});
