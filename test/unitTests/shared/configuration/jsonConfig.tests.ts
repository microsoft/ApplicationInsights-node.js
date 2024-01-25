// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import { JsonConfig } from "../../../../src/shared/configuration/jsonConfig";
import * as assert from "assert";
import * as path from "path";
import sinon = require("sinon");

describe("Json Config", () => {
    let originalEnv: NodeJS.ProcessEnv;
    let sandbox: sinon.SinonSandbox;

    before(() => {
        sandbox = sinon.createSandbox();
    });

    beforeEach(() => {
        originalEnv = process.env;
        JsonConfig["_instance"] = undefined;
    });

    afterEach(() => {
        process.env = originalEnv;
        JsonConfig["_instance"] = undefined;
        sandbox.restore();
    });

    describe("configuration values", () => {
        it("Should take configuration from JSON string in APPLICATIONINSIGHTS_CONFIGURATION_CONTENT", () => {
            const env = <{ [id: string]: string }>{};

            let inputJson = {
                "enableAutoCollectExceptions": true,
                "extendedMetrics": { "gc": true, "heap": true, "loop": true },
                "otlpTraceExporterConfig": { enabled: true },
                "otlpMetricExporterConfig": { enabled: true },
                "otlpLogExporterConfig": { enabled: true },
                "enableAutoCollectPerformance": true,
                "azureMonitorExporterOptions": { connectionString: "testConnString" },
                "samplingRatio": 1,
                "instrumentationOptions": {
                    "http": { "enabled": true },
                    "azureSdk": { "enabled": false },
                    "mongoDb": { "enabled": false },
                    "mySql": { "enabled": false },
                    "postgreSql": { "enabled": false },
                    "redis": { "enabled": false },
                    "redis4": { "enabled": false },
                    "console": { "enabled": true },
                    "bunyan": { "enabled": true },
                    "winston": { "enabled": true }
                }
            };
            env["APPLICATIONINSIGHTS_CONFIGURATION_CONTENT"] = JSON.stringify(inputJson);
            process.env = env;
            const config = JsonConfig.getInstance();

            assert.strictEqual(config.enableAutoCollectExceptions, true);
            assert.strictEqual(config.instrumentationOptions.console.enabled, true);
            assert.strictEqual(config.instrumentationOptions.bunyan.enabled, true);
            assert.strictEqual(config.instrumentationOptions.winston.enabled, true);
            assert.strictEqual(config.extendedMetrics.gc, true);
            assert.strictEqual(config.extendedMetrics.heap, true);
            assert.strictEqual(config.extendedMetrics.loop, true);
            assert.strictEqual(config.otlpTraceExporterConfig.enabled, true);
            assert.strictEqual(config.otlpMetricExporterConfig.enabled, true);
            assert.strictEqual(config.enableAutoCollectPerformance, true);
            assert.strictEqual(config.samplingRatio, 1);
            assert.strictEqual(config.instrumentationOptions.http.enabled, true);
            assert.strictEqual(config.instrumentationOptions.azureSdk.enabled, false);
            assert.strictEqual(config.instrumentationOptions.mongoDb.enabled, false);
            assert.strictEqual(config.instrumentationOptions.mySql.enabled, false);
            assert.strictEqual(config.instrumentationOptions.postgreSql.enabled, false);
            assert.strictEqual(config.instrumentationOptions.redis.enabled, false);
            assert.strictEqual(config.instrumentationOptions.redis4.enabled, false);
            assert.strictEqual(config.azureMonitorExporterOptions.connectionString, "testConnString");
        });

        it("should get config file if an absolute path", () => {
            const env = <{ [id: string]: string }>{};
            env["APPLICATIONINSIGHTS_CONFIGURATION_FILE"] = "/test/test.json";
            process.env = env;
            const stub = sandbox.stub(path, "isAbsolute").returns(true);
            JsonConfig.getInstance();
            assert.ok(stub.calledOnce);
        });
    });
});
