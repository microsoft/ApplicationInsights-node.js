import * as assert from "assert";
import * as sinon from "sinon";
import * as os from "os";

import { HeartBeatHandler } from "../../../src/autoCollection/metrics/handlers/heartBeatHandler";
import { Config } from "../../../src/library/configuration";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { ResourceManager } from "../../../src/library/handlers";
import { MetricData } from "@opentelemetry/sdk-metrics-base";
import { HeartBeatMetricName } from "../../../src/declarations/constants";

describe("AutoCollection/HeartBeat", () => {
    var sandbox: sinon.SinonSandbox;
    let originalEnv: NodeJS.ProcessEnv;
    let config: Config;

    before(() => {
        sandbox = sinon.createSandbox();
        config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
    })

    beforeEach(() => {
        originalEnv = process.env;
    });

    afterEach(() => {
        process.env = originalEnv;
        sandbox.restore();
    });

    describe("#Metrics", () => {
        it("should create instruments", () => {
            let heartBeat = new HeartBeatHandler(config);
            sandbox.stub(heartBeat["_metricReader"]["_exporter"], "export");
            assert.ok(heartBeat["_metricGauge"], "_metricGauge not available");
        });

        it("should observe instruments during collection", async () => {
            let heartBeat = new HeartBeatHandler(config, { collectionInterval: 100 });
            let mockExport = sandbox.stub(heartBeat["_exporter"], "export");
            await heartBeat.start();
            await new Promise(resolve => setTimeout(resolve, 120));
            assert.ok(mockExport.called);
            let resourceMetrics = mockExport.args[0][0];
            const scopeMetrics = resourceMetrics.scopeMetrics;
            assert.strictEqual(scopeMetrics.length, 1, 'scopeMetrics count');
            const metrics = scopeMetrics[0].metrics;
            assert.strictEqual(metrics.length, 1, 'metrics count');
            assert.equal(metrics[0].descriptor.name, HeartBeatMetricName);
        });

        it("should not collect when disabled", async () => {
            let heartBeat = new HeartBeatHandler(config);
            let mockExport = sandbox.stub(heartBeat["_exporter"], "export");
            heartBeat.start();
            heartBeat.shutdown();
            await new Promise(resolve => setTimeout(resolve, 120));
            assert.ok(mockExport.notCalled);
        });
    });

    describe("#_getMachineProperties()", () => {
        it("should read correct web app values from environment variable", (done) => {
            const heartBeat = new HeartBeatHandler(config);
            sandbox.stub(heartBeat["_metricReader"]["_exporter"], "export");
            var env1 = <{ [id: string]: string }>{};
            env1["WEBSITE_SITE_NAME"] = "site_name";
            env1["WEBSITE_HOME_STAMPNAME"] = "stamp_name";
            env1["WEBSITE_HOSTNAME"] = "host_name";
            process.env = env1;

            heartBeat["_getMachineProperties"]().then((properties) => {
                const keys = Object.keys(properties);
                assert.equal(
                    keys.length,
                    5,
                    "should have 5 kv pairs added when resource type is appSrv"
                );
                assert.equal(keys[0], "sdk", "sdk should be added as a key");
                assert.equal(keys[1], "osType", "osType should be added as a key");
                assert.equal(
                    keys[2],
                    "appSrv_SiteName",
                    "appSrv_SiteName should be added as a key"
                );
                assert.equal(keys[3], "appSrv_wsStamp", "appSrv_wsStamp should be added as a key");
                assert.equal(keys[4], "appSrv_wsHost", "appSrv_wsHost should be added as a key");
                assert.equal(
                    properties["sdk"],
                    ResourceManager.getInstance().getMetricResource().attributes[SemanticResourceAttributes.TELEMETRY_SDK_VERSION],
                    "sdk version should be read from Context"
                );
                assert.equal(
                    properties["osType"],
                    os.type(),
                    "osType should be read from os library"
                );
                assert.equal(
                    properties["appSrv_SiteName"],
                    "site_name",
                    "appSrv_SiteName should be read from environment variable"
                );
                assert.equal(
                    properties["appSrv_wsStamp"],
                    "stamp_name",
                    "appSrv_wsStamp should be read from environment variable"
                );
                assert.equal(
                    properties["appSrv_wsHost"],
                    "host_name",
                    "appSrv_wsHost should be read from environment variable"
                );
                done();
            }).catch(error => done(error));
        });

        it("should read correct function app values from environment variable", (done) => {
            const heartbeat = new HeartBeatHandler(config);
            sandbox.stub(heartbeat["_metricReader"]["_exporter"], "export");
            var env2 = <{ [id: string]: string }>{};
            env2["FUNCTIONS_WORKER_RUNTIME"] = "nodejs";
            env2["WEBSITE_HOSTNAME"] = "host_name";
            process.env = env2;

            heartbeat["_getMachineProperties"]().then((properties) => {

                const keys = Object.keys(properties);
                assert.equal(
                    keys.length,
                    3,
                    "should have 3 kv pairs added when resource type is function app"
                );
                assert.equal(keys[0], "sdk", "sdk should be added as a key");
                assert.equal(keys[1], "osType", "osType should be added as a key");
                assert.equal(
                    keys[2],
                    "azfunction_appId",
                    "azfunction_appId should be added as a key"
                );
                assert.equal(
                    properties["sdk"],
                    ResourceManager.getInstance().getMetricResource().attributes[SemanticResourceAttributes.TELEMETRY_SDK_VERSION],
                    "sdk version should be read from Context"
                );
                assert.equal(
                    properties["osType"],
                    os.type(),
                    "osType should be read from os library"
                );
                assert.equal(
                    properties["azfunction_appId"],
                    "host_name",
                    "azfunction_appId should be read from environment variable"
                );
                done();
            });
        });
    });
});
