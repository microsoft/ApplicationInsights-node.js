import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as sinon from "sinon";
import * as http from "http";
import * as https from "https";

import { ApplicationInsightsConfig } from "../../../src/shared";
import { JsonConfig } from "../../../src/shared/configuration/jsonConfig";
import { ENV_AZURE_PREFIX, ENV_IKEY } from "../../../src/shared/configuration/types";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

const ENV_connectionString = "APPLICATIONINSIGHTS_CONNECTION_STRING";

describe("Library/Config", () => {
    const iKey = "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
    let originalEnv: NodeJS.ProcessEnv;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        originalEnv = process.env;
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        process.env = originalEnv;
        sandbox.restore();
        JsonConfig["_instance"] = undefined;
    });

    describe("#constructor", () => {
        describe("connection string && API && environment variable prioritization", () => {
            it("connection string set via in code setup", () => {
                const env = {
                    [ENV_connectionString]: "InstrumentationKey=cs.env",
                    [ENV_IKEY]: "ikey.env",
                };
                process.env = env;
                const config = new ApplicationInsightsConfig();
                config.connectionString = "InstrumentationKey=cs.code";
                assert.deepEqual(config.getInstrumentationKey(), "cs.code");
            });

            it("connection string set via environment variable", () => {
                const env = {
                    [ENV_connectionString]: "InstrumentationKey=cs.env",
                    [ENV_IKEY]: "ikey.env",
                };
                process.env = env;
                const config = new ApplicationInsightsConfig();
                assert.deepEqual(config.getInstrumentationKey(), "cs.env");
            });

            it("instrumentation key set via environment variable", () => {
                const env = { [ENV_IKEY]: "ikey.env" };
                process.env = env;
                const config = new ApplicationInsightsConfig();
                assert.deepEqual(config.getInstrumentationKey(), "ikey.env");
            });

            it("merge JSON config", () => {
                JsonConfig["_instance"] = undefined;
                const env = <{ [id: string]: string }>{};
                const customConfigJSONPath = path.resolve(
                    __dirname,
                    "../../../../test/unitTests/shared/config.json"
                );
                env["APPLICATIONINSIGHTS_CONFIGURATION_FILE"] = customConfigJSONPath; // Load JSON config
                process.env = env;
                const config = new ApplicationInsightsConfig();
                assert.equal(
                    config["_connectionString"],
                    "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/"
                );
                assert.equal(config.samplingRate, 0.3, "Wrong samplingRate");
                assert.equal(config.disableOfflineStorage, true, "Wrong disableOfflineStorage");
                assert.equal(config.storageDirectory, "testPath", "Wrong storageDirectory");
                assert.equal(
                    config.enableAutoCollectExceptions,
                    false,
                    "Wrong enableAutoCollectExceptions"
                );
                assert.equal(
                    config.enableAutoCollectPerformance,
                    false,
                    "Wrong enableAutoCollectPerformance"
                );
                assert.equal(
                    config.enableAutoCollectStandardMetrics,
                    false,
                    "Wrong enableAutoCollectStandardMetrics"
                );
                assert.equal(
                    config.enableAutoCollectHeartbeat,
                    false,
                    "Wrong enableAutoCollectHeartbeat"
                );
                assert.equal(config.extendedMetrics.loop, true, "Wrong loop");
                assert.equal(config.extendedMetrics.gc, true, "Wrong gc");
                assert.equal(config.extendedMetrics.heap, true, "Wrong heap");
                assert.equal(config.instrumentations.azureSdk.enabled, true, "Wrong azureSdk");
                assert.equal(config.instrumentations.mongoDb.enabled, true, "Wrong mongoDb");
                assert.equal(config.instrumentations.mySql.enabled, true, "Wrong mySql");
                assert.equal(config.instrumentations.postgreSql.enabled, true, "Wrong postgreSql");
                assert.equal(config.instrumentations.redis.enabled, true, "Wrong redis");
                assert.equal(config.instrumentations.redis4.enabled, true, "Wrong redis4");
                assert.equal(config.logInstrumentations.console.enabled, true, "Wrong console");
                assert.equal(config.logInstrumentations.bunyan.enabled, true, "Wrong bunyan");
                assert.equal(config.logInstrumentations.winston.enabled, true, "Wrong winston");
            });

            it("Default config", () => {
                const config = new ApplicationInsightsConfig();
                assert.equal(config.samplingRate, 1, "Wrong samplingRate");
                assert.equal(
                    config.enableAutoCollectExceptions,
                    true,
                    "Wrong enableAutoCollectExceptions"
                );
                assert.equal(
                    config.enableAutoCollectPerformance,
                    true,
                    "Wrong enableAutoCollectPerformance"
                );
                assert.equal(
                    config.enableAutoCollectStandardMetrics,
                    true,
                    "Wrong enableAutoCollectStandardMetrics"
                );
                assert.equal(
                    config.enableAutoCollectHeartbeat,
                    true,
                    "Wrong enableAutoCollectHeartbeat"
                );
                assert.equal(config.extendedMetrics.loop, false, "Wrong loop");
                assert.equal(config.extendedMetrics.gc, false, "Wrong gc");
                assert.equal(config.extendedMetrics.heap, false, "Wrong heap");
                assert.equal(config.instrumentations.azureSdk.enabled, false, "Wrong azureSdk");
                assert.equal(config.instrumentations.mongoDb.enabled, false, "Wrong mongoDb");
                assert.equal(config.instrumentations.mySql.enabled, false, "Wrong mySql");
                assert.equal(config.instrumentations.postgreSql.enabled, false, "Wrong postgreSql");
                assert.equal(config.instrumentations.redis.enabled, false, "Wrong redis");
                assert.equal(config.instrumentations.redis4.enabled, false, "Wrong redis4");
                assert.equal(
                    config.disableOfflineStorage,
                    undefined,
                    "Wrong disableOfflineStorage"
                );
                assert.equal(config.storageDirectory, undefined, "Wrong storageDirectory");
                assert.equal(config.logInstrumentations.console.enabled, false, "Wrong console");
                assert.equal(config.logInstrumentations.bunyan.enabled, false, "Wrong bunyan");
                assert.equal(config.logInstrumentations.winston.enabled, false, "Wrong winston");
            });

            it("Should take configurations from environment variables", () => {
                const env = <{ [id: string]: string }>{};
                env["APPLICATIONINSIGHTS_CONNECTION_STRING"] = "TestConnectionString";
                env["APPLICATION_INSIGHTS_NO_STATSBEAT"] = "true";
                process.env = env;
                const config = new ApplicationInsightsConfig();
                assert.equal(config.connectionString, "TestConnectionString");
                assert.equal(config["_disableStatsbeat"], true);
            });
        });

        describe("constructor", () => {
            beforeEach(() => {
                sandbox.stub(http, "request");
                sandbox.stub(https, "request");
            });

            it("should read iKey from environment", () => {
                const env = <{ [id: string]: string }>{};
                env[ENV_IKEY] = iKey;
                process.env = env;
                const config = new ApplicationInsightsConfig();
                assert.equal(config.getInstrumentationKey(), iKey);
            });

            it("should read iKey from azure environment", () => {
                const env = <{ [id: string]: string }>{};
                env[ENV_AZURE_PREFIX + ENV_IKEY] = iKey;
                process.env = env;
                const config = new ApplicationInsightsConfig();
                assert.equal(config.getInstrumentationKey(), iKey);
            });

            it("should initialize valid values", () => {
                const config = new ApplicationInsightsConfig();
                config.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
                assert(typeof config.getInstrumentationKey() === "string");
                assert(typeof config.samplingRate === "number");
            });

            it("instrumentation key validation-valid key passed", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new ApplicationInsightsConfig();
                config.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
                assert.ok(warnStub.notCalled, "warning was not raised");
            });

            it("instrumentation key validation-invalid key passed", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new ApplicationInsightsConfig();
                config.connectionString = "InstrumentationKey=1aa11111bbbb1ccc8dddeeeeffff3333";
                assert.ok(warnStub.calledOn, "warning was raised");
            });

            it("instrumentation key validation-invalid key passed", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new ApplicationInsightsConfig();
                config.connectionString = "abc";
                assert.ok(warnStub.calledOn, "warning was raised");
            });
        });
    });

    describe("OpenTelemetry Resource", () => {

        beforeEach(() => {
            sandbox.stub(os, "hostname").callsFake(() => "host");
        });

        it("should allow custom resource to be configured", () => {
            let customAttributes: any = {};
            customAttributes[SemanticResourceAttributes.SERVICE_NAME] = "testServiceName";
            customAttributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID] = "testServiceInstanceId";
            customAttributes[SemanticResourceAttributes.CONTAINER_ID] = "testContainerId";
            let customResource = new Resource(customAttributes);
            const config = new ApplicationInsightsConfig();
            config.resource = customResource;
            assert.strictEqual(config.resource.attributes[SemanticResourceAttributes.SERVICE_NAME], "testServiceName");
            assert.strictEqual(config.resource.attributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID], "testServiceInstanceId");
            assert.strictEqual(config.resource.attributes[SemanticResourceAttributes.CONTAINER_ID], "testContainerId");
        });

        it("Default values", () => {
            const packageJsonPath = path.resolve(__dirname, "../../../../", "./package.json");
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
            const config = new ApplicationInsightsConfig();
            assert.equal(
                config.resource.attributes[
                    SemanticResourceAttributes.TELEMETRY_SDK_VERSION
                ].toString(),
                `node:${packageJson.version}`
            );
            assert.equal(
                config.resource.attributes[
                SemanticResourceAttributes.SERVICE_INSTANCE_ID
                ],
                "host"
            );
            assert.equal(
                config.resource.attributes[
                SemanticResourceAttributes.SERVICE_NAME
                ],
                "Web"
            );
        });

        it("should correctly set Azure attributes", () => {
            const env = <{ [id: string]: string }>{};
            const originalEnv = process.env;
            env.WEBSITE_SITE_NAME = "testRole";
            env.WEBSITE_INSTANCE_ID = "testRoleInstanceId";
            process.env = env;
            const config = new ApplicationInsightsConfig();
            process.env = originalEnv;
            assert.equal(
                config.resource.attributes[
                SemanticResourceAttributes.SERVICE_INSTANCE_ID
                ],
                "testRoleInstanceId"
            );
            assert.equal(
                config.resource.attributes[
                SemanticResourceAttributes.SERVICE_NAME
                ],
                "testRole"
            );
        });
    });
});
