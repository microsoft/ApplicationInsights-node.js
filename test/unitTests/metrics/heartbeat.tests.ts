import * as assert from "assert";
import * as sinon from "sinon";
import * as os from "os";

import { HeartBeatHandler } from "../../../src/metrics/handlers/heartBeatHandler";
import { ApplicationInsightsConfig } from "../../../src/shared";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

describe("AutoCollection/HeartBeat", () => {
    let sandbox: sinon.SinonSandbox;
    let originalEnv: NodeJS.ProcessEnv;
    let config: ApplicationInsightsConfig;
    let heartbeat: HeartBeatHandler;

    before(() => {
        sandbox = sinon.createSandbox();
        config = new ApplicationInsightsConfig();
        config.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
        heartbeat = new HeartBeatHandler(config, { collectionInterval: 100 });
        sandbox.stub(heartbeat["_metricReader"]["_exporter"], "export");
    });

    beforeEach(() => {
        originalEnv = process.env;
    });

    afterEach(() => {
        process.env = originalEnv;
        sandbox.restore();
    });

    after(() => {
        heartbeat.shutdown();
    });

    describe("#Metrics", () => {
        it("should create instruments", () => {
            assert.ok(heartbeat["_metricGauge"], "_metricGauge not available");
        });

        it("should observe instruments during collection", async () => {
            const mockExport = sandbox.stub(heartbeat["_azureExporter"], "export");
            await new Promise((resolve) => setTimeout(resolve, 120));
            assert.ok(mockExport.called);
            const resourceMetrics = mockExport.args[0][0];
            const scopeMetrics = resourceMetrics.scopeMetrics;
            assert.strictEqual(scopeMetrics.length, 1, "scopeMetrics count");
            const metrics = scopeMetrics[0].metrics;
            assert.strictEqual(metrics.length, 1, "metrics count");
            assert.equal(metrics[0].descriptor.name, "HeartbeatState");
        });

        it("should not collect when shutdown", async () => {
            const mockExport = sandbox.stub(heartbeat["_azureExporter"], "export");
            heartbeat.shutdown();
            await new Promise((resolve) => setTimeout(resolve, 120));
            assert.ok(mockExport.notCalled);
        });
    });

    describe("#_getMachineProperties()", () => {
        it("should read correct web app values from environment variables", () => {
            const env1 = <{ [id: string]: string }>{};
            env1["WEBSITE_SITE_NAME"] = "site_name";
            env1["WEBSITE_HOME_STAMPNAME"] = "stamp_name";
            env1["WEBSITE_HOSTNAME"] = "host_name";
            env1["WEBSITE_OWNER_NAME"] = "owner_name";
            env1["WEBSITE_RESOURCE_GROUP"] = "resource_group";
            env1["WEBSITE_SLOT_NAME"] = "slot_name";
            process.env = env1;

            const properties = heartbeat["_getMachineProperties"]();
            const keys = Object.keys(properties);
            assert.equal(
                keys.length,
                10,
                "should have 10 kv pairs added when resource type is appSrv"
            );
            assert.equal(keys[0], "sdkVersion", "sdk should be added as a key");
            assert.equal(keys[1], "osType", "osType should be added as a key");
            assert.equal(keys[2], "osVersion", "osVersion should be added as a key");
            assert.equal(keys[3], "processSessionId", "processSessionId should be added as a key");
            assert.equal(
                keys[4],
                "appSrv_SiteName",
                "appSrv_SiteName should be added as a key"
            );
            assert.equal(
                keys[5],
                "appSrv_wsStamp",
                "appSrv_wsStamp should be added as a key"
            );
            assert.equal(
                keys[6],
                "appSrv_wsHost",
                "appSrv_wsHost should be added as a key"
            );
            assert.equal(
                keys[7],
                "appSrv_wsOwner",
                "appSrv_wsOwner should be added as a key"
            );
            assert.equal(
                keys[8],
                "appSrv_ResourceGroup",
                "appSrv_ResourceGroup should be added as a key"
            );
            assert.equal(
                keys[9],
                "appSrv_SlotName",
                "appSrv_SlotName should be added as a key"
            );
            assert.equal(
                properties["sdkVersion"],
                config.resource.attributes[
                SemanticResourceAttributes.TELEMETRY_SDK_VERSION
                ],
                "sdk version should be read from Context"
            );
            assert.equal(
                properties["osType"],
                os.type(),
                "osType should be read from os library"
            );
            assert.equal(
                properties["osVersion"],
                os.release(),
                "osVersion should be read from os library"
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
            assert.equal(
                properties["appSrv_wsOwner"],
                "owner_name",
                "appSrv_wsOwner should be read from environment variable"
            );
            assert.equal(
                properties["appSrv_ResourceGroup"],
                "resource_group",
                "appSrv_ResourceGroup should be read from environment variable"
            );
            assert.equal(
                properties["appSrv_SlotName"],
                "slot_name",
                "appSrv_SlotName should be read from environment variable"
            );
        });
    });
});
