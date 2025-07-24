// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import assert from "assert";
import sinon from "sinon";
import azureCoreAuth = require("@azure/core-auth");
import { HttpInstrumentationConfig } from '@opentelemetry/instrumentation-http';
import Config = require('../../../src/shim/shim-config');
import { TelemetryClient } from "../../../src/shim/telemetryClient";
import http = require("http");
import https = require("https");
import { DistributedTracingModes } from '../../../applicationinsights';
import { checkWarnings } from './testUtils';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { defaultResource } from '@opentelemetry/resources';

class TestTokenCredential implements azureCoreAuth.TokenCredential {
    private _expiresOn: Date;
    private _numberOfRefreshs = 0;

    constructor(expiresOn?: Date) {
        this._expiresOn = expiresOn || new Date();
    }

    async getToken(scopes: string | string[], options?: any): Promise<any> {
        this._numberOfRefreshs++;
        return {
            token: "testToken" + this._numberOfRefreshs,
            expiresOnTimestamp: this._expiresOn
        };
    }
}

describe("shim/configuration/config", () => {
    const connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/";

    let originalEnv: NodeJS.ProcessEnv;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        originalEnv = process.env;
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
        process.env = originalEnv;
    })

    describe("#Shim config()", () => {
        it("should initialize config values", () => {
            const config = new Config(connectionString);
            config.endpointUrl = "https://centralus-0.in.applicationinsights.azure.com/";
            config.proxyHttpUrl = "http://localhost:8888";
            config.proxyHttpsUrl = "https://localhost:3000";
            config.correlationHeaderExcludedDomains = ["https://www.bing.com"];
            config.samplingPercentage = 50;
            config.enableAutoCollectExternalLoggers = true;
            config.enableAutoCollectExceptions = true;
            config.enableAutoCollectConsole = true;
            config.enableAutoCollectExceptions = true;
            config.enableAutoCollectPerformance = true;
            config.enableAutoCollectRequests = true;
            config.enableAutoCollectDependencies = true;
            config.aadTokenCredential = new TestTokenCredential();
            config.maxBatchIntervalMs = 1000;
            config.enableUseDiskRetryCaching = true;

            let options = config.parseConfig();

            assert.equal(options.samplingRatio, 0.5, "wrong samplingRatio");
            assert.equal(options.azureMonitorExporterOptions.connectionString, connectionString), "wrong connectionString";
            assert.equal(options.azureMonitorExporterOptions.proxyOptions.host, "localhost", "wrong host");
            assert.equal(options.azureMonitorExporterOptions.proxyOptions.port, 3000, "wrong port");
            assert.equal(JSON.stringify(options.instrumentationOptions), JSON.stringify({
                "http": { "enabled": true },
                "azureSdk": { "enabled": true },
                "mongoDb": { "enabled": true },
                "mySql": { "enabled": true },
                "redis": { "enabled": true },
                "redis4": { "enabled": true },
                "postgreSql": { "enabled": true },
                "bunyan": { "enabled": true },
                "winston": { "enabled": true },
                "console": { "enabled": true },
            }),
                "wrong instrumentationOptions");
            assert.equal(JSON.stringify(options.instrumentationOptions.bunyan), JSON.stringify({ enabled: true }), "wrong bunyan setting");
            assert.equal(options.enableAutoCollectExceptions, true, "wrong enableAutoCollectExceptions");
            assert.equal(options.enableAutoCollectPerformance, true, "wrong enableAutoCollectPerformance");
            assert.equal(options.azureMonitorExporterOptions.credential, config.aadTokenCredential, "wrong credential");
            assert.equal(options.instrumentationOptions.http.enabled, true);
            assert.equal(
                JSON.stringify(options.otlpTraceExporterConfig),
                JSON.stringify({ timeoutMillis: 1000 }), "wrong otlpTraceExporterConfig"
            );
            assert.equal(
                JSON.stringify(options.otlpMetricExporterConfig),
                JSON.stringify({ timeoutMillis: 1000 }), "wrong otlpMetricExporterConfig"
            );
            assert.equal(
                JSON.stringify(options.otlpLogExporterConfig),
                JSON.stringify({ timeoutMillis: 1000 }), "wrong otlpLogExporterConfig"
            );
            assert.equal(options.azureMonitorExporterOptions.disableOfflineStorage, false, "wrong disableOfflineStorage");
        });

        it("should initialize zero sampling percentage", () => {
            const config = new Config(connectionString);
            config.samplingPercentage = 0;

            let options = config.parseConfig();

            assert.equal(options.samplingRatio, 0, "wrong samplingRatio");
        });


        it("should allow customization of Azure Monitor Distro configuration", () => {
            let spanProcessors = [new BatchSpanProcessor(new ConsoleSpanExporter())];
            // Create a proper log record processor that matches Azure Monitor's expected interface
            class TestLogRecordProcessor {
                onEmit(_logRecord: any, _context?: any): void {
                    // Test implementation - does nothing
                }
                async forceFlush(): Promise<void> {
                    // Test implementation
                }
                async shutdown(): Promise<void> {
                    // Test implementation
                }
            }
            
            let logRecordProcessors = [new TestLogRecordProcessor()];
            let resource = defaultResource();
            const config = new Config(connectionString);
            config.azureMonitorOpenTelemetryOptions = {
                resource: resource,
                enableTraceBasedSamplingForLogs: false,
                enableLiveMetrics: false,
                enableStandardMetrics: false,
                logRecordProcessors: logRecordProcessors,
                spanProcessors: spanProcessors
            };

            let options = config.parseConfig();
            assert.equal(options.resource, resource, "wrong resource");
            assert.equal(options.enableTraceBasedSamplingForLogs, false, "wrong enableTraceBasedSamplingForLogs");
            assert.equal(options.enableLiveMetrics, false, "wrong enableLiveMetrics");
            assert.equal(options.enableStandardMetrics, false, "wrong enableStandardMetrics");
            assert.equal(options.logRecordProcessors, logRecordProcessors, "wrong logRecordProcessors");
            assert.equal(options.spanProcessors, spanProcessors, "wrong spanProcessors");
        });


        it("should activate DEBUG internal logger", () => {
            const env = <{ [id: string]: string }>{};
            process.env = env;
            const config = new Config(connectionString);
            config.enableInternalDebugLogging = true;
            config.parseConfig();
            assert.equal(process.env["APPLICATIONINSIGHTS_INSTRUMENTATION_LOGGING_LEVEL"], "DEBUG");
        });

        it("should activate WARN internal logger", () => {
            const env = <{ [id: string]: string }>{};
            process.env = env;
            const config = new Config(connectionString);
            config.enableInternalWarningLogging = true;
            config.parseConfig();
            assert.equal(process.env["APPLICATIONINSIGHTS_INSTRUMENTATION_LOGGING_LEVEL"], "WARN");
        });

        it("should set context tags on logs and spans", () => {
            const telemetryClient = new TelemetryClient(connectionString);
            telemetryClient.context.tags = { "ai.cloud.role": "testRole", "ai.cloud.roleInstance": "testRoleInstance" };
            telemetryClient.initialize();
            telemetryClient["_attributeSpanProcessor"]["_attributes"] = { "ai.cloud.role": "testRole", "ai.cloud.roleInstance": "testRoleInstance" };
            telemetryClient["_attributeLogProcessor"]["_attributes"] = { "ai.cloud.role": "testRole", "ai.cloud.roleInstance": "testRoleInstance" };
        });

        it("should disable instrumentations when noDiagnosticChannel is set", () => {
            const config = new Config(connectionString);
            config.noDiagnosticChannel = true;
            let options = config.parseConfig();
            assert.equal(JSON.stringify(options.instrumentationOptions), JSON.stringify({
                "http": { "enabled": true },
                "azureSdk": { "enabled": false },
                "mongoDb": { "enabled": false },
                "mySql": { "enabled": false },
                "redis": { "enabled": false },
                "redis4": { "enabled": false },
                "postgreSql": { "enabled": false },
                "bunyan": { "enabled": false },
                "winston": { "enabled": false },
                "console": { "enabled": false },
            }));
        });

        it("should disable specific instrumentations when noPatchModules is set", () => {
            const config = new Config(connectionString);
            config.noPatchModules = "azuresdk,mongodb-core,redis,pg-pool";
            let options = config.parseConfig();
            assert.equal(JSON.stringify(options.instrumentationOptions), JSON.stringify({
                http: { enabled: true },
                azureSdk: { enabled: false },
                mongoDb: { enabled: false },
                mySql: { enabled: true },
                redis: { enabled: false },
                redis4: { enabled: false },
                postgreSql: { enabled: false },
                bunyan: { enabled: true },
                winston: { enabled: true },
                console: { enabled: false },
            }));
        });

        it("should disable http if dependencies and requests are disabled", () => {
            const config = new Config(connectionString);
            config.enableAutoCollectDependencies = false;
            config.enableAutoCollectRequests = false;
            let options = config.parseConfig();
            const http: HttpInstrumentationConfig = options.instrumentationOptions.http as HttpInstrumentationConfig;
            const ignoreFunction = (request: http.RequestOptions) => true;
            assert.equal(options.instrumentationOptions.http.enabled, false);
            assert.equal(JSON.stringify(http.ignoreIncomingRequestHook), JSON.stringify(ignoreFunction));
            assert.equal(JSON.stringify(http.ignoreOutgoingRequestHook), JSON.stringify(ignoreFunction));
        });

        it("should disable external loggers", () => {
            const config = new Config(connectionString);
            config.enableAutoCollectExternalLoggers = false;
            let options = config.parseConfig();
            assert.equal(JSON.stringify(options.instrumentationOptions), JSON.stringify({
                "http": { "enabled": true },
                "azureSdk": { "enabled": true },
                "mongoDb": { "enabled": true },
                "mySql": { "enabled": true },
                "redis": { "enabled": true },
                "redis4": { "enabled": true },
                "postgreSql": { "enabled": true },
                "bunyan": { "enabled": false },
                "winston": { "enabled": false },
                "console": { "enabled": false },
            }));
        });

        it("should disable standard metrics", () => {
            const config = new Config(connectionString);
            config.enableAutoCollectPreAggregatedMetrics = false;
            config.parseConfig();
            assert.equal(process.env["APPLICATION_INSIGHTS_NO_STANDARD_METRICS"], "disable");
        });

        it("should warn if an invalid sampling percentage is passed in", () => {
            const config = new Config(connectionString);
            const warnings = config["_configWarnings"];
            config.samplingPercentage = 101;
            config.parseConfig();
            assert.ok(checkWarnings("Sampling percentage should be between 0 and 100. Defaulting to 100.", warnings), "warning was not raised");
        });

        it("should not warn if a sampling percentage is not passed in", () => {
            const config = new Config(connectionString);
            const warnings = config["_configWarnings"];
            config.parseConfig();
            assert.ok(!checkWarnings("Sampling percentage should be between 0 and 100. Defaulting to 100.", warnings), "warning was not raised");
        });

        describe("#Shim unsupported messages", () => {
            it("should warn if disableAppInsights is set", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                config.disableAppInsights = true;
                config.parseConfig();
                assert.ok(checkWarnings("disableAppInsights configuration no longer supported.", warnings), "warning was not raised");
            });

            it("should warn if collect heartbeat is set", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                config.enableAutoCollectHeartbeat = true;
                config.parseConfig();
                assert.ok(checkWarnings("Heartbeat metrics are no longer supported.", warnings), "warning was not raised");
            });

            it("should warn if auto dependency correlation is set to false", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                config.enableAutoDependencyCorrelation = false;
                config.parseConfig();
                assert.ok(checkWarnings("Auto dependency correlation cannot be turned off anymore.", warnings), "warning was not raised");
            });

            it("should warn if auto request generation is azure functions is set", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                config.enableAutoCollectIncomingRequestAzureFunctions = true;
                config.parseConfig();
                assert.ok(checkWarnings("Auto request generation in Azure Functions is no longer supported.", warnings), "warning was not raised");
            });

            it("should warn if using async hooks is set to false", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                config.enableUseAsyncHooks = false;
                config.parseConfig();
                assert.ok(checkWarnings("The use of non async hooks is no longer supported.", warnings), "warning was not raised");
            });

            it("should warn if distributed tracing mode is set to AI", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                config.distributedTracingMode = DistributedTracingModes.AI;
                config.parseConfig();
                assert.ok(checkWarnings("AI only distributed tracing mode is no longer supported.", warnings), "warning was not raised");
            });

            it("should warn if resend interval is set", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                config.enableResendInterval = 1;
                config.parseConfig();
                assert.ok(checkWarnings("The resendInterval configuration option is not supported by the shim.", warnings), "warning was not raised");
            });

            it("should warn if max bytes on disk is set", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                config.enableMaxBytesOnDisk = 1;
                config.parseConfig();
                assert.ok(checkWarnings("The maxBytesOnDisk configuration option is not supported by the shim.", warnings), "warning was not raised");
            });

            it("should warn if ignore legacy headers is false", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                config.ignoreLegacyHeaders = false;
                config.parseConfig();
                assert.ok(checkWarnings("LegacyHeaders are not supported by the shim.", warnings), "warning was not raised");
            });

            it("should warn if max batch size is set", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                config.maxBatchSize = 1;
                config.parseConfig();
                assert.ok(checkWarnings("The maxBatchSize configuration option is not supported by the shim.", warnings), "warning was not raised");
            });

            it("should warn if logger errors are set to traces", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                config.enableLoggerErrorToTrace = true;
                config.parseConfig();
                assert.ok(checkWarnings("The enableLoggerErrorToTrace configuration option is not supported by the shim.", warnings), "warning was not raised");
            });

            it("should warn if httpAgent or httpsAgent are set", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                config.httpAgent = new http.Agent();
                config.httpsAgent = new https.Agent();
                config.parseConfig();
                assert.ok(checkWarnings("The httpAgent and httpsAgent configuration options are not supported by the shim.", warnings), "warning was not raised");
            });

            it("should warn if web instrumentations are set", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                config.webInstrumentationConfig = [{ name: "test", value: true }];
                config.webInstrumentationSrc = "test";
                config.parseConfig();
                assert.ok(checkWarnings("The webInstrumentation config and src options are not supported by the shim.", warnings), "warning was not raised");
            });

            it("should warn if correlationHeaderExcludedDomains is set", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                config.correlationHeaderExcludedDomains = ["test.com"];
                config.parseConfig();
                assert.ok(checkWarnings("The correlationHeaderExcludedDomains configuration option is not supported by the shim.", warnings), "warning was not raised");
            });

            it("should warn if extended metric disablers are set", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                config.extendedMetricDisablers = "gc";
                config.parseConfig();
                assert.ok(checkWarnings("Extended metrics are no longer supported.", warnings), "warning was not raised");
            });

            it("should warn if extended metrics are set", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                config.enableAutoCollectExtendedMetrics = { gc: true, heap: false };
                config.parseConfig();
                assert.ok(checkWarnings("Extended metrics are no longer supported.", warnings), "warning was not raised");
            });

            it("should warn if extended metrics are set", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                config.enableAutoCollectExtendedMetrics = { gc: true, heap: false };
                config.parseConfig();
                assert.ok(checkWarnings("Extended metrics are no longer supported.", warnings), "warning was not raised");
            });

            it("should warn if disableAllExtendedMetrics is set", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                config.disableAllExtendedMetrics = true;
                config.parseConfig();
                assert.ok(checkWarnings("Extended metrics are no longer supported.", warnings), "warning was not raised");
            });

            it("should warn if disable all extended meetrics env var is set", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                process.env["APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS"] = "false";
                config.parseConfig();
                assert.ok(checkWarnings("Extended metrics are no longer supported.", warnings), "warning was not raised");
            });

            it("should warn if disable specific extended metric env var is set", () => {
                const config = new Config(connectionString);
                const warnings = config["_configWarnings"];
                process.env["APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC"] = "gc,heap";
                config.parseConfig();
                assert.ok(checkWarnings("Extended metrics are no longer supported.", warnings), "warning was not raised");
            });
        });
    });
});
