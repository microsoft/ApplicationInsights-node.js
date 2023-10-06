// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import assert = require('assert');
import sinon = require('sinon');
import azureCoreAuth = require("@azure/core-auth");
import { DiagLogLevel } from '@opentelemetry/api';
import { HttpInstrumentationConfig } from '@opentelemetry/instrumentation-http';
import { Logger } from "../../../src/shared/logging"
import Config = require('../../../src/shim/shim-config');
import { TelemetryClient } from "../../../src/shim/telemetryClient";
import http = require("http");
import https = require("https");
import { DistributedTracingModes } from '../../../applicationinsights';


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
            config.enableAutoCollectExtendedMetrics = true;
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
            assert.equal(JSON.stringify(options.logInstrumentationOptions), JSON.stringify({ console: { enabled: true }, winston: { enabled: true }, bunyan: { enabled: true } }), "wrong logInstrumentationOptions");
            assert.equal(options.enableAutoCollectExceptions, true, "wrong enableAutoCollectExceptions");
            assert.equal(options.enableAutoCollectPerformance, true, "wrong enableAutoCollectPerformance");
            assert.equal(JSON.stringify(options.extendedMetrics), JSON.stringify({ gc: true, heap: true, loop: true }), "wrong extendedMetrics");
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
            assert.equal(options.extendedMetrics.heap, true, "wrong heap");
            assert.equal(options.extendedMetrics.loop, true, "wrong loop");
            assert.equal(options.extendedMetrics.gc, true, "wrong gc");
        });

        it("should activate DEBUG internal logger", () => {
            const config = new Config(connectionString);
            config.enableInternalDebugLogging = true;
            config.parseConfig();
            assert.equal(Logger.getInstance()["_diagLevel"], DiagLogLevel.DEBUG);
        });

        it("should activate WARN internal logger", () => {
            const config = new Config(connectionString);
            config.enableInternalWarningLogging = true;
            config.parseConfig();
            assert.equal(Logger.getInstance()["_diagLevel"], DiagLogLevel.WARN);
        });

        it("should disableAllExtendedMetrics", () => {
            const config = new Config(connectionString);
            config.disableAllExtendedMetrics = true;
            let options = config.parseConfig();
            assert.equal(JSON.stringify(options.extendedMetrics), JSON.stringify({ gc: false, heap: false, loop: false }));
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
                http: { enabled: true },
                azureSdk: { enabled: false },
                mongoDb: { enabled: false },
                mySql: { enabled: false },
                redis: { enabled: false },
                redis4: { enabled: false },
                postgreSql: { enabled: false }
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
                postgreSql: { enabled: false }
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
            assert.equal(JSON.stringify(options.logInstrumentationOptions), JSON.stringify({ console: { enabled: false }, winston: { enabled: false }, bunyan: { enabled: false } }));
        });

        it("should disable standard metrics", () => {
            const config = new Config(connectionString);
            config.enableAutoCollectPreAggregatedMetrics = false;
            config.parseConfig();
            assert.equal(process.env["APPLICATION_INSIGHTS_NO_STANDARD_METRICS"], "disable");
        });

        it("should disable specific native metrics", () => {
            const config = new Config(connectionString);
            config.extendedMetricDisablers = "heap,gc";
            config.parseConfig();
            let options = config.parseConfig();
            assert.equal(options.extendedMetrics.heap, false);
            assert.equal(options.extendedMetrics.gc, false);
        });

        describe("#Shim unsupported messages", () => {
            it("should warn if disableAppInsights is set", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new Config(connectionString);
                config.disableAppInsights = true;
                config.parseConfig();
                assert.ok(warnStub.calledOn, "warning was not raised");
            });

            it("should warn if collect heartbeat is set", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new Config(connectionString);
                config.enableAutoCollectHeartbeat = true;
                config.parseConfig();
                assert.ok(warnStub.calledOn, "warning was not raised");
            });

            it("should warn if auto dependency correlation is set to false", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new Config(connectionString);
                config.enableAutoDependencyCorrelation = false;
                config.parseConfig();
                assert.ok(warnStub.calledOn, "warning was not raised");
            });

            it("should warn if auto request generation is azure functions is set", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new Config(connectionString);
                config.enableAutoCollectIncomingRequestAzureFunctions = true;
                config.parseConfig();
                assert.ok(warnStub.calledOn, "warning was not raised");
            });

            it("should warn if live metrics is set", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new Config(connectionString);
                config.enableSendLiveMetrics = true;
                config.parseConfig();
                assert.ok(warnStub.calledOn, "warning was not raised");
            });

            it("should warn if using async hooks is set to false", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new Config(connectionString);
                config.enableUseAsyncHooks = false;
                config.parseConfig();
                assert.ok(warnStub.calledOn, "warning was not raised");
            });

            it("should warn if distributed tracing mode is set to AI", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new Config(connectionString);
                config.distributedTracingMode = DistributedTracingModes.AI;
                config.parseConfig();
                assert.ok(warnStub.calledOn, "warning was not raised");
            });

            it("should warn if resend interval is set", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new Config(connectionString);
                config.enableResendInterval = 1;
                config.parseConfig();
                assert.ok(warnStub.calledOn, "warning was not raised");
            });

            it("should warn if max bytes on disk is set", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new Config(connectionString);
                config.enableMaxBytesOnDisk = 1;
                config.parseConfig();
                assert.ok(warnStub.calledOn, "warning was not raised");
            });

            it("should warn if ignore legacy headers is false", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new Config(connectionString);
                config.ignoreLegacyHeaders = false;
                config.parseConfig();
                assert.ok(warnStub.calledOn, "warning was not raised");
            });

            it("should warn if max batch size is set", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new Config(connectionString);
                config.maxBatchSize = 1;
                config.parseConfig();
                assert.ok(warnStub.calledOn, "warning was not raised");
            });

            it("should warn if logger errors are set to traces", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new Config(connectionString);
                config.enableLoggerErrorToTrace = true;
                config.parseConfig();
                assert.ok(warnStub.calledOn, "warning was not raised");
            });

            it("should warn if httpAgent or httpsAgent are set", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new Config(connectionString);
                config.httpAgent = new http.Agent();
                config.httpsAgent = new https.Agent();
                config.parseConfig();
                assert.ok(warnStub.calledOn, "warning was not raised");
            });

            it("should warn if web instrumentations are set", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new Config(connectionString);
                config.enableWebInstrumentation = true;
                config.webInstrumentationConfig = [{name: "test", value: true}];
                config.webInstrumentationSrc = "test";
                config.webInstrumentationConnectionString = "test";
                config.parseConfig();
                assert.ok(warnStub.calledOn, "warning was not raised");
            });

            it("should warn if correlationHeaderExcludedDomains is set", () => {
                const warnStub = sandbox.stub(console, "warn");
                const config = new Config(connectionString);
                config.correlationHeaderExcludedDomains = ["test.com"];
                config.parseConfig();
                assert.ok(warnStub.calledOn, "warning was not raised");
            });
        });
    });
});
