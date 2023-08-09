import assert = require('assert');
import sinon = require('sinon');
import { TelemetryClient } from '../../../applicationinsights';
import { HttpInstrumentationConfig } from '@opentelemetry/instrumentation-http';
import { CorrelationContextManager } from '../../../src/shim/correlationContextManager';
const applicationInsights = require('../../../applicationinsights');
import azureCoreAuth = require("@azure/core-auth");
import { Logger } from "../../../src/shim/logging"
import { DiagLogLevel } from '@opentelemetry/api';

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
        process.env["APPLICATION_INSIGHTS_SHIM_CONFIGURATION"] = "true";
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        process.env = originalEnv;
        delete process.env.APPLICATION_INSIGHTS_SHIM_CONFIGURATION;
        sandbox.restore();
    })

    describe("#constructor()", () => {
        it("should initialize config values", () => {
            const telemetryClient = new TelemetryClient(connectionString);
            const disableContextSpy = sandbox.spy(CorrelationContextManager, "disable");
            applicationInsights.setup(connectionString);
            telemetryClient.config.instrumentationKey = "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
            telemetryClient.config.endpointUrl = "https://centralus-0.in.applicationinsights.azure.com/";
            telemetryClient.config.proxyHttpUrl = "http://localhost:8888",
            telemetryClient.config.proxyHttpsUrl = "https://localhost:3000",
            telemetryClient.config.correlationHeaderExcludedDomains = ["https://www.bing.com"],
            telemetryClient.config.samplingPercentage = 50;
            telemetryClient.config.enableAutoCollectExternalLoggers = true;
            telemetryClient.config.enableAutoCollectExceptions = true;
            telemetryClient.config.enableAutoCollectConsole = true;
            telemetryClient.config.enableAutoCollectExceptions = true;
            telemetryClient.config.enableAutoCollectPerformance = true;
            telemetryClient.config.enableAutoCollectExtendedMetrics = true;
            telemetryClient.config.enableAutoCollectRequests = true;
            telemetryClient.config.enableAutoCollectDependencies = true;
            telemetryClient.config.enableAutoDependencyCorrelation = false;
            telemetryClient.config.noHttpAgentKeepAlive = true;
            telemetryClient.config.aadTokenCredential = new TestTokenCredential();
            telemetryClient.start();

            assert.equal(telemetryClient["_options"].samplingRatio, 0.5);
            assert.equal(telemetryClient["_options"].azureMonitorExporterConfig.connectionString, connectionString);
            assert.equal(telemetryClient["_options"].azureMonitorExporterConfig.proxyOptions.host, "localhost");
            assert.equal(telemetryClient["_options"].azureMonitorExporterConfig.proxyOptions.port, 3000);
            const ignoreOutgoingUrls = telemetryClient["_options"].instrumentationOptions.http as HttpInstrumentationConfig;
            assert.equal(ignoreOutgoingUrls.ignoreOutgoingUrls, "https://www.bing.com");
            assert.equal(JSON.stringify(telemetryClient["_options"].logInstrumentations), JSON.stringify({ console: { enabled: true }, winston: { enabled: true }, bunyan: { enabled: true } }));
            assert.equal(telemetryClient["_options"].enableAutoCollectExceptions, true);
            assert.equal(telemetryClient["_options"].enableAutoCollectPerformance, true);
            assert.equal(JSON.stringify(telemetryClient["_options"].extendedMetrics), JSON.stringify({ gc: true, heap: true, loop: true }));
            assert.equal(telemetryClient["_options"].instrumentationOptions.http.hasOwnProperty("ignoreIncomingRequestHook"), true);
            assert.equal(telemetryClient["_options"].instrumentationOptions.http.hasOwnProperty("ignoreOutgoingRequestHook"), true);
            assert.ok(disableContextSpy.calledOnce);
            assert.equal(telemetryClient["_options"].otlpTraceExporterConfig.keepAlive, false);
            assert.equal(telemetryClient["_options"].otlpMetricExporterConfig.keepAlive, false);
            assert.equal(telemetryClient["_options"].otlpLogExporterConfig.keepAlive, false);
            assert.equal(telemetryClient["_options"].azureMonitorExporterConfig.aadTokenCredential, telemetryClient.config.aadTokenCredential);
        });

        it("should activate internal loggers", () => {
            const telemetryClient = new TelemetryClient(connectionString);
            assert.equal(Logger.getInstance()["_diagLevel"], DiagLogLevel.WARN);
            telemetryClient.config.enableInternalDebugLogging = true;
            telemetryClient.start();
            assert.equal(Logger.getInstance()["_diagLevel"], DiagLogLevel.DEBUG);
        });

        it("should disableALlExtenededMetrics", () => {
            const telemetryClient = new TelemetryClient(connectionString);
            telemetryClient.config.disableAllExtendedMetrics = true;
            telemetryClient.start();
            assert.equal(JSON.stringify(telemetryClient["_options"].extendedMetrics), JSON.stringify({ gc: false, heap: false, loop: false }));
        });

        it("should unsubscribe when noDiagnosticChannel is set", () => {
            const telemetryClient = new TelemetryClient(connectionString);
            telemetryClient.config.noDiagnosticChannel = true;
            telemetryClient.start();
            assert.equal(JSON.stringify(telemetryClient["_options"].instrumentationOptions), JSON.stringify({
                azureSdk: {
                    ...telemetryClient["_options"].instrumentationOptions.azureSdk,
                    enabled: false
                },
                http: {
                    ...telemetryClient["_options"].instrumentationOptions.http,
                    enabled: false
                },
                mongoDb: {
                    ...telemetryClient["_options"].instrumentationOptions.mongoDb,
                    enabled: false
                },
                mySql: {
                    ...telemetryClient["_options"].instrumentationOptions.mySql,
                    enabled: false
                },
                redis: {
                    ...telemetryClient["_options"].instrumentationOptions.redis,
                    enabled: false
                },
                redis4: {
                    ...telemetryClient["_options"].instrumentationOptions.redis4,
                    enabled: false
                },
                postgreSql: {
                    ...telemetryClient["_options"].instrumentationOptions.postgreSql,
                    enabled: false
                }
            }));
            assert.equal(JSON.stringify(telemetryClient["_options"].logInstrumentations), JSON.stringify({
                bunyan: {
                    ...telemetryClient["_options"].logInstrumentations.bunyan,
                    enabled: false
                },
                console: {
                    ...telemetryClient["_options"].logInstrumentations.console,
                    enabled: false
                },
                winston: {
                    ...telemetryClient["_options"].logInstrumentations.winston,
                    enabled: false
                }
            }));
        });

        it("should disableAppInsights", () => {
            applicationInsights.setup(connectionString);
            applicationInsights.defaultClient.config.disableAppInsights = true;
            applicationInsights.start();
            assert.equal(applicationInsights.defaultClient, undefined);
        });
    });
});
