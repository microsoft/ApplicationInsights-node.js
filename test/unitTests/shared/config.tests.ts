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
            it("connection string set via in configuration", () => {
                const env = {
                    [ENV_connectionString]: "InstrumentationKey=cs.env",
                    [ENV_IKEY]: "ikey.env",
                };
                process.env = env;
                const config = new ApplicationInsightsConfig();
                config.azureMonitorExporterConfig.connectionString = "InstrumentationKey=cs.code";
                assert.deepEqual(config.azureMonitorExporterConfig.connectionString, "InstrumentationKey=cs.code");
            });

            it("connection string set via in configuration[Deprecated]", () => {
                const env = {
                    [ENV_connectionString]: "InstrumentationKey=cs.env",
                    [ENV_IKEY]: "ikey.env",
                };
                process.env = env;
                const config = new ApplicationInsightsConfig();
                config.connectionString = "InstrumentationKey=cs.code";
                assert.deepEqual(config.azureMonitorExporterConfig.connectionString, "InstrumentationKey=cs.code");
            });

            it("connection string set via environment variable", () => {
                const env = {
                    [ENV_connectionString]: "InstrumentationKey=cs.env",
                    [ENV_IKEY]: "ikey.env",
                };
                process.env = env;
                const config = new ApplicationInsightsConfig();
                assert.deepEqual(config.azureMonitorExporterConfig.connectionString, "InstrumentationKey=cs.env");
            });

            it("instrumentation key set via environment variable", () => {
                const env = { [ENV_IKEY]: "ikey.env" };
                process.env = env;
                const config = new ApplicationInsightsConfig();
                assert.deepEqual(config.azureMonitorExporterConfig.connectionString, "InstrumentationKey=ikey.env;IngestionEndpoint=https://dc.services.visualstudio.com");
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
                    config.azureMonitorExporterConfig.connectionString,
                    "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/"
                );
                assert.equal(config.samplingRatio, 0.3, "Wrong samplingRatio");
                assert.equal(config.azureMonitorExporterConfig.disableOfflineStorage, true, "Wrong disableOfflineStorage");
                assert.equal(config.azureMonitorExporterConfig.storageDirectory, "testPath", "Wrong storageDirectory");
                assert.equal(config.otlpTraceExporterConfig.enabled, true, "Wrong otlpTraceExporterConfig enabled");
                assert.equal(config.otlpTraceExporterConfig.baseConfig.keepAlive, false, "Wrong otlpTraceExporterConfig keepAlive");
                assert.equal(config.otlpTraceExporterConfig.baseConfig.url, "someurlfortraces", "Wrong otlpTraceExporterConfig url");

                assert.equal(config.otlpMetricExporterConfig.enabled, true, "Wrong otlpMetricExporterConfig enabled");
                assert.equal(config.otlpMetricExporterConfig.baseConfig.keepAlive, true, "Wrong otlpMetricExporterConfig keepAlive");
                assert.equal(config.otlpMetricExporterConfig.baseConfig.url, "someurlformetrics", "Wrong otlpMetricExporterConfig url");


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
                assert.equal(config.samplingRatio, 1, "Wrong samplingRatio");
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
                    config.azureMonitorExporterConfig.disableOfflineStorage,
                    undefined,
                    "Wrong disableOfflineStorage"
                );
                assert.equal(config.azureMonitorExporterConfig.storageDirectory, undefined, "Wrong storageDirectory");
                assert.equal(config.otlpMetricExporterConfig.enabled, undefined, "Wrong otlpMetricExporterConfig.enabled");
                assert.equal(config.otlpMetricExporterConfig.baseConfig, undefined, "Wrong otlpMetricExporterConfig.baseConfig");
                assert.equal(config.otlpTraceExporterConfig.enabled, undefined, "Wrong otlpTraceExporterConfig.enabled");
                assert.equal(config.otlpTraceExporterConfig.baseConfig, undefined, "Wrong otlpTraceExporterConfig.baseConfig");
                assert.equal(config.logInstrumentations.console.enabled, false, "Wrong console");
                assert.equal(config.logInstrumentations.bunyan.enabled, false, "Wrong bunyan");
                assert.equal(config.logInstrumentations.winston.enabled, false, "Wrong winston");
            });

            it("Should take configurations from environment variables", () => {
                const env = <{ [id: string]: string }>{};
                env["APPLICATIONINSIGHTS_CONNECTION_STRING"] = "TestConnectionString";
                process.env = env;
                const config = new ApplicationInsightsConfig();
                assert.equal(config.connectionString, "TestConnectionString");
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
                assert.equal(
                    config.azureMonitorExporterConfig.connectionString,
                    "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://dc.services.visualstudio.com");
            });

            it("should read iKey from azure environment", () => {
                const env = <{ [id: string]: string }>{};
                env[ENV_AZURE_PREFIX + ENV_IKEY] = iKey;
                process.env = env;
                const config = new ApplicationInsightsConfig();
                assert.equal(
                    config.azureMonitorExporterConfig.connectionString,
                    "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://dc.services.visualstudio.com");
            });

            it("should initialize valid values", () => {
                const config = new ApplicationInsightsConfig();
                config.azureMonitorExporterConfig.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
                assert(typeof config.azureMonitorExporterConfig.connectionString === "string");
                assert(typeof config.samplingRatio === "number");
            });

            it("instrumentation key validation-valid key passed", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new ApplicationInsightsConfig();
                config.azureMonitorExporterConfig.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
                assert.ok(warnStub.notCalled, "warning was not raised");
            });

            it("instrumentation key validation-invalid key passed", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new ApplicationInsightsConfig();
                config.azureMonitorExporterConfig.connectionString = "InstrumentationKey=1aa11111bbbb1ccc8dddeeeeffff3333";
                assert.ok(warnStub.calledOn, "warning was raised");
            });

            it("instrumentation key validation-invalid key passed", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new ApplicationInsightsConfig();
                config.azureMonitorExporterConfig.connectionString = "abc";
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

        it("OTEL_RESOURCE_ATTRIBUTES", () => {
            const env = <{ [id: string]: string }>{};
            const originalEnv = process.env;
            env.OTEL_RESOURCE_ATTRIBUTES = "service.name=testServiceName,service.instance.id=testServiceInstance,k8s.cluster.name=testClusterName,k8s.node.name=testNodeName";
            process.env = env;
            const config = new ApplicationInsightsConfig();
            process.env = originalEnv;
            assert.equal(
                config.resource.attributes[
                SemanticResourceAttributes.SERVICE_NAME
                ],
                "testServiceName"
            );
            assert.equal(
                config.resource.attributes[
                SemanticResourceAttributes.SERVICE_INSTANCE_ID
                ],
                "testServiceInstance"
            );
            assert.equal(
                config.resource.attributes[
                SemanticResourceAttributes.K8S_CLUSTER_NAME
                ],
                "testClusterName"
            );
            assert.equal(
                config.resource.attributes[
                SemanticResourceAttributes.K8S_NODE_NAME
                ],
                "testNodeName"
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
