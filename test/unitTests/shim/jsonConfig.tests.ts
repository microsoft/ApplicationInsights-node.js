import assert = require("assert");
import path = require("path");
import { ShimJsonConfig } from "../../../src/shim/shim-jsonConfig";
import { HttpInstrumentationConfig } from "@opentelemetry/instrumentation-http";
const applicationInsights = require('../../../applicationinsights');

describe("Json Config", () => {
    const connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/";

    beforeEach(() => {
        ShimJsonConfig["_instance"] = undefined;
        applicationInsights.dispose();
    });

    afterEach(() => {
        ShimJsonConfig["_instance"] = undefined;
        applicationInsights.dispose();
    });

    describe("configuration values", () => {
        it("should take configurations from the JSON config file", () => {
            const cutstomConfigJsonPath = path.resolve(__dirname, "../../../../test/unitTests/shim/config.json");
            process.env["APPLICATIONINSIGHTS_CONFIGURATION_FILE"] = cutstomConfigJsonPath;

            applicationInsights.setup(connectionString);
            applicationInsights.start();

            assert.equal(applicationInsights["defaultClient"]["_options"].azureMonitorExporterConfig.connectionString, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            assert.equal(applicationInsights["defaultClient"]["_options"].azureMonitorExporterConfig.proxyOptions.host, "test");
            assert.equal(applicationInsights["defaultClient"]["_options"].azureMonitorExporterConfig.proxyOptions.port, 3000);
            assert.equal(applicationInsights["defaultClient"]["_options"].samplingRatio, 0.3, JSON.stringify(ShimJsonConfig["_instance"]));
            const ignoreOutgoingUrls = applicationInsights["defaultClient"]["_options"].instrumentationOptions.http as HttpInstrumentationConfig;
            assert.equal(ignoreOutgoingUrls.ignoreOutgoingUrls, "bing.com");
            assert.equal(JSON.stringify(applicationInsights["defaultClient"]["_options"].logInstrumentations), JSON.stringify({ winston: { enabled: true }, bunyan: { enabled: true }, console: { enabled: true } }));
            assert.equal(applicationInsights["defaultClient"]["_options"].enableAutoCollectExceptions, true);
            assert.equal(applicationInsights["defaultClient"]["_options"].enableAutoCollectPerformance, true);
            assert.equal(JSON.stringify(applicationInsights["defaultClient"]["_options"].extendedMetrics), JSON.stringify({ gc: true, heap: true, loop: true }));
            assert.equal(applicationInsights["defaultClient"]["_options"].instrumentationOptions.http.hasOwnProperty("ignoreIncomingRequestHook"), true);
            assert.equal(applicationInsights["defaultClient"]["_options"].instrumentationOptions.http.hasOwnProperty("ignoreOutgoingRequestHook"), true);
            assert.equal(
                JSON.stringify(applicationInsights["defaultClient"]["_options"].otlpTraceExporterConfig),
                JSON.stringify({timeoutMillis: 1000})
            );
            assert.equal(
                JSON.stringify(applicationInsights["defaultClient"]["_options"].otlpMetricExporterConfig),
                JSON.stringify({timeoutMillis: 1000})
            );
            assert.equal(
                JSON.stringify(applicationInsights["defaultClient"]["_options"].otlpLogExporterConfig),
                JSON.stringify({timeoutMillis: 1000})
            );
            assert.equal(JSON.stringify(applicationInsights["defaultClient"]["_options"].instrumentationOptions.redis), JSON.stringify({ enabled: false }));
            assert.equal(JSON.stringify(applicationInsights["defaultClient"]["_options"].instrumentationOptions.azureSdk), JSON.stringify({ enabled: false }));

            delete process.env.APPLICATIONINSIGHTS_CONFIGURATION_FILE;
        });

        it("should take configurations from environment variables", () => {
            process.env["APPLICATIONINSIGHTS_CONNECTION_STRING"] = connectionString;
            process.env["APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC"] = "gc";
            process.env["APPLICATION_INSIGHTS_NO_PATCH_MODULES"] = "azuresdk";
            process.env["APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS"] = "true";
            process.env["APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL"] = "true";
            process.env["APPLICATION_INSIGHTS_NO_HTTP_AGENT_KEEP_ALIVE"] = "true";
            process.env["https_proxy"] = "https://testproxy:3000";

            applicationInsights.setup();
            applicationInsights.start();
            assert.equal(applicationInsights["defaultClient"]["_options"].azureMonitorExporterConfig.connectionString, connectionString);
            assert.equal(JSON.stringify(applicationInsights["defaultClient"]["_options"].extendedMetrics), JSON.stringify({ gc: false, heap: false, loop: false }, applicationInsights["defaultClient"]["_options"].extendedMetrics));
            assert.equal(JSON.stringify(applicationInsights["defaultClient"]["_options"].instrumentationOptions.redis), JSON.stringify({ enabled: false }));
            assert.equal(JSON.stringify(applicationInsights["defaultClient"]["_options"].instrumentationOptions.redis4), JSON.stringify({ enabled: false }));
            assert.equal(JSON.stringify(applicationInsights["defaultClient"]["_options"].instrumentationOptions.postgreSql), JSON.stringify({ enabled: false }));
            assert.equal(applicationInsights["defaultClient"]["_options"].azureMonitorExporterConfig.proxyOptions.host, "testproxy");
            assert.equal(applicationInsights["defaultClient"]["_options"].azureMonitorExporterConfig.proxyOptions.port, 3000);

            delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
            delete process.env.APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC;
            delete process.env.APPLICATION_INSIGHTS_NO_PATCH_MODULES;
            delete process.env.APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS;
            delete process.env.APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL;
            delete process.env.APPLICATION_INSIGHTS_NO_HTTP_AGENT_KEEP_ALIVE;
            delete process.env.https_proxy;
        });

        it("should take configuration from JSON string", () => {
            const inputJson = {
                "connectionString": "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/",
                "endpointUrl": "testEndpointUrl",
                "disableAllExtendedMetrics": false,
                "disableAppInsights": false,
                "samplingPercentage": 60,
                "correlationHeaderExcludedDomains": ["bing.com"],
                "proxyHttpsUrl": "https://test:3000",
                "enableAutoCollectExternalLoggers": true,
                "enableAutoCollectConsole": true,
                "enableAutoCollectExceptions": true,
                "enableAutoCollectPerformance": true,
                "enableAutoCollectExtendedMetrics": true,
                "enableAutoCollectPreAggregatedMetrics": true,
                "enableAutoCollectRequests": true,
                "enableAutoCollectDependencies": true,
                "enableAutoDependencyCorrelation": true,
                "enableAutoCollectIncomingRequestAzureFunctions": false,
                "noHttpAgentKeepAlive": true,
                "distributedTracingMode": 0,
                "enableInternalDebugLogging": false,
                "enableInternalWarningLogging": false,
                "extendedMetricDisablers": "gc,heap",
                "noDiagnosticChannel": false,
                "noPatchModules": "redis,azuresdk",
                "maxBatchIntervalMs": 1500
            };
            process.env["APPLICATIONINSIGHTS_CONFIGURATION_CONTENT"] = JSON.stringify(inputJson);
            applicationInsights.setup();
            applicationInsights.start();
            assert.equal(applicationInsights["defaultClient"]["_options"].azureMonitorExporterConfig.connectionString, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            assert.equal(applicationInsights["defaultClient"]["_options"].azureMonitorExporterConfig.proxyOptions.host, "test");
            assert.equal(applicationInsights["defaultClient"]["_options"].azureMonitorExporterConfig.proxyOptions.port, 3000);
            assert.equal(applicationInsights["defaultClient"]["_options"].samplingRatio, 0.6, JSON.stringify(ShimJsonConfig["_instance"]));
            const ignoreOutgoingUrls = applicationInsights["defaultClient"]["_options"].instrumentationOptions.http as HttpInstrumentationConfig;
            assert.equal(ignoreOutgoingUrls.ignoreOutgoingUrls, "bing.com");
            assert.equal(JSON.stringify(applicationInsights["defaultClient"]["_options"].logInstrumentations), JSON.stringify({ console: { enabled: true }, winston: { enabled: true }, bunyan: { enabled: true } }));
            assert.equal(applicationInsights["defaultClient"]["_options"].enableAutoCollectExceptions, true);
            assert.equal(applicationInsights["defaultClient"]["_options"].enableAutoCollectPerformance, true);
            assert.equal(JSON.stringify(applicationInsights["defaultClient"]["_options"].extendedMetrics), JSON.stringify({ gc: true, heap: true, loop: true }));
            assert.equal(applicationInsights["defaultClient"]["_options"].instrumentationOptions.http.hasOwnProperty("ignoreIncomingRequestHook"), true);
            assert.equal(applicationInsights["defaultClient"]["_options"].instrumentationOptions.http.hasOwnProperty("ignoreOutgoingRequestHook"), true);
            assert.equal(
                JSON.stringify(applicationInsights["defaultClient"]["_options"].otlpTraceExporterConfig),
                JSON.stringify({ timeoutMillis: 1500, enabled: false })
            );
            assert.equal(
                JSON.stringify(applicationInsights["defaultClient"]["_options"].otlpMetricExporterConfig),
                JSON.stringify({ timeoutMillis: 1500, enabled: false })
            );
            assert.equal(
                JSON.stringify(applicationInsights["defaultClient"]["_options"].otlpLogExporterConfig),
                JSON.stringify({ timeoutMillis: 1500, enabled: false })
            );
            assert.equal(JSON.stringify(applicationInsights["defaultClient"]["_options"].instrumentationOptions.redis), JSON.stringify({ enabled: false }));
            assert.equal(JSON.stringify(applicationInsights["defaultClient"]["_options"].instrumentationOptions.azureSdk), JSON.stringify({ enabled: false }));

            delete process.env.APPLICATIONINSIGHTS_CONFIGURATION_CONTENT;
        });
    });
});
