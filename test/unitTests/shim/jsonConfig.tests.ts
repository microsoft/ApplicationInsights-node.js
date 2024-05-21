import assert = require("assert");
import path = require("path");
import { ShimJsonConfig } from "../../../src/shim/shim-jsonConfig";


describe("Json Config", () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = process.env;
        ShimJsonConfig["_instance"] = undefined;
    });

    afterEach(() => {
        process.env = originalEnv;
        ShimJsonConfig["_instance"] = undefined;
    });

    describe("configuration values", () => {
        it("should take configurations from the JSON config file", () => {
            const cutstomConfigJsonPath = path.resolve(__dirname, "../../../../test/unitTests/shim/config.json");
            process.env["APPLICATIONINSIGHTS_CONFIGURATION_FILE"] = cutstomConfigJsonPath;

            let config = ShimJsonConfig.getInstance();
            assert.equal(config.connectionString, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            assert.equal(config.endpointUrl, "testEndpointUrl");
            assert.equal(config.maxBatchSize, 150);
            assert.equal(config.maxBatchIntervalMs, 12000);
            assert.equal(config.disableAppInsights, false);
            assert.equal(config.samplingPercentage, 30);
            assert.equal(config.correlationHeaderExcludedDomains[0], "domain1");
            assert.equal(config.correlationHeaderExcludedDomains[1], "domain2");
            assert.equal(config.proxyHttpUrl, "testProxyHttpUrl");
            assert.equal(config.proxyHttpsUrl, "testProxyHttpsUrl");
            assert.equal(config.ignoreLegacyHeaders, false);
            assert.equal(config.enableAutoCollectExternalLoggers, false);
            assert.equal(config.enableAutoCollectConsole, false);
            assert.equal(config.enableAutoCollectExceptions, false);
            assert.equal(config.enableAutoCollectPerformance, false);
            assert.equal(config.enableAutoCollectPreAggregatedMetrics, false);
            assert.equal(config.enableAutoCollectHeartbeat, false);
            assert.equal(config.enableAutoCollectRequests, false);
            assert.equal(config.enableAutoCollectDependencies, false);
            assert.equal(config.enableAutoDependencyCorrelation, false);
            assert.equal(config.enableAutoCollectIncomingRequestAzureFunctions, false);
            assert.equal(config.enableUseAsyncHooks, false);
            assert.equal(config.enableAutoCollectExtendedMetrics, false);
            assert.equal(config.noHttpAgentKeepAlive, false);
            assert.equal(config.distributedTracingMode, 0);
            assert.equal(config.enableUseDiskRetryCaching, false);
            assert.equal(config.enableResendInterval, 123);
            assert.equal(config.enableMaxBytesOnDisk, 456);
            assert.equal(config.enableInternalDebugLogging, false);
            assert.equal(config.enableInternalWarningLogging, false);
            assert.equal(config.enableSendLiveMetrics, false);
            assert.equal(config.extendedMetricDisablers, "gc,heap");
            assert.equal(config.noDiagnosticChannel, false);
            assert.equal(config.noPatchModules, "console,redis");
            assert.equal(config.quickPulseHost, "testquickpulsehost.com");
            assert.equal(config.enableWebInstrumentation, true);
            assert.equal(config.webInstrumentationConnectionString, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3330;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            assert.deepEqual(config.webInstrumentationConfig, [{ name: "key1", value: "key1" }, { name: "key2", value: true }],);
            assert.equal(config.webInstrumentationSrc, "webInstrumentationSourceFromJson");
        });

        it("Should take configurations from environment variables", () => {
            const env = <{ [id: string]: string }>{};
            env["APPLICATIONINSIGHTS_CONNECTION_STRING"] = "TestConnectionString";
            env["APPLICATION_INSIGHTS_NO_PATCH_MODULES"] = "azuresdk";
            env["APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL"] = "disabled";
            env["APPLICATION_INSIGHTS_NO_HTTP_AGENT_KEEP_ALIVE"] = "disabled";
            env["APPLICATIONINSIGHTS_WEB_INSTRUMENTATION_ENABLED"] = "true";
            env["APPLICATIONINSIGHTS_WEB_INSTRUMENTATION_CONNECTION_STRING"] = "WebInstrumentationConnectionString";
            env["APPLICATIONINSIGHTS_WEB_INSTRUMENTATION_SOURCE"] = "WebInstrumentationTestSource";
            process.env = env;
            const config = ShimJsonConfig.getInstance();
            assert.equal(config.connectionString, "TestConnectionString");
            assert.equal(config.noDiagnosticChannel, true, "wrong noDiagnosticChannel");
            assert.equal(config.noHttpAgentKeepAlive, true, "wrong noHttpAgentKeepAlive");
            assert.equal(config.noPatchModules, "azuresdk");
            assert.equal(config.enableWebInstrumentation, true, "wrong enableWebInstrumentation");
            assert.equal(config.webInstrumentationConnectionString, "WebInstrumentationConnectionString");
            assert.equal(config.webInstrumentationSrc, "WebInstrumentationTestSource");
        });

        it("Should take configurations from JSON config file over environment variables if both are configured", () => {
            const env = <{ [id: string]: string }>{};
            const cutstomConfigJsonPath = path.resolve(__dirname, "../../../../test/unitTests/shim/config.json");
            env["APPLICATIONINSIGHTS_CONFIGURATION_FILE"] = cutstomConfigJsonPath;
            env["APPLICATIONINSIGHTS_CONNECTION_STRING"] = "TestConnectionString";
            env["APPLICATION_INSIGHTS_NO_PATCH_MODULES"] = "azuresdk";
            env["http_proxy"] = "testProxyHttpUrl2";
            env["https_proxy"] = "testProxyHttpsUrl2";
            env["APPINSIGHTS_WEB_SNIPPET_ENABLED"] = "false";
            env["APPLICATIONINSIGHTS_WEB_INSTRUMENTATION_ENABLED"] = "WebInstrumentationConnectionString";
            env["APPLICATIONINSIGHTS_WEB_INSTRUMENTATION_CONNECTION_STRING"] = "true";
            env["APPLICATIONINSIGHTS_WEB_INSTRUMENTATION_SOURCE"] = "WebInstrumentationTestSource"
            process.env = env;
            const config = ShimJsonConfig.getInstance();
            assert.equal(config.connectionString, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            assert.equal(config.proxyHttpUrl, "testProxyHttpUrl");
            assert.equal(config.proxyHttpsUrl, "testProxyHttpsUrl");
            assert.equal(config.noDiagnosticChannel, false);
            assert.equal(config.noHttpAgentKeepAlive, false);
            assert.equal(config.noPatchModules, "console,redis");
            assert.equal(config.enableWebInstrumentation, true);
            assert.equal(config.webInstrumentationConnectionString, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3330;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            assert.equal(config.webInstrumentationSrc, "webInstrumentationSourceFromJson");
        });

        it("Should take configuration from JSON string in APPLICATIONINSIGHTS_CONFIGURATION_CONTENT", () => {
            const env = <{ [id: string]: string }>{};

            let inputJson = {
                "connectionString": "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/",
                "endpointUrl": "testEndpointUrl",
                "disableAllExtendedMetrics": false,
                "maxBatchSize": 150,
                "maxBatchIntervalMs": 12000,
                "disableAppInsights": false,
                "samplingPercentage": 30,
                "correlationHeaderExcludedDomains": [
                    "domain1",
                    "domain2"
                ],
                "proxyHttpUrl": "testProxyHttpUrl",
                "proxyHttpsUrl": "testProxyHttpsUrl",
                "ignoreLegacyHeaders": false,
                "enableAutoCollectExternalLoggers": false,
                "enableAutoCollectConsole": false,
                "enableAutoCollectExceptions": false,
                "enableAutoCollectPerformance": false,
                "enableAutoCollectExtendedMetrics": false,
                "enableAutoCollectPreAggregatedMetrics": false,
                "enableAutoCollectHeartbeat": false,
                "enableAutoCollectRequests": false,
                "enableAutoCollectDependencies": false,
                "enableAutoDependencyCorrelation": false,
                "enableAutoCollectIncomingRequestAzureFunctions": false,
                "enableUseAsyncHooks": false,
                "noHttpAgentKeepAlive": false,
                "distributedTracingMode": 0,
                "enableUseDiskRetryCaching": false,
                "enableResendInterval": 123,
                "enableMaxBytesOnDisk": 456,
                "enableInternalDebugLogging": false,
                "enableInternalWarningLogging": false,
                "enableSendLiveMetrics": false,
                "extendedMetricDisablers": "gc,heap",
                "noDiagnosticChannel": false,
                "noPatchModules": "console,redis",
                "quickPulseHost": "testquickpulsehost.com",
                "enableWebInstrumentation": true,
                "webInstrumentationConnectionString": "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3330;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/",
                "webInstrumentationConfig": [{"name": "key1","value": "key1"},{"name":"key2", "value": true}],
                "webInstrumentationSrc":"webInstrumentationSourceFromJson"
            };
            env["APPLICATIONINSIGHTS_CONFIGURATION_CONTENT"] = JSON.stringify(inputJson);
            process.env = env;
            const config = ShimJsonConfig.getInstance();
            assert.equal(config.connectionString, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            assert.equal(config.endpointUrl, "testEndpointUrl");
            assert.equal(config.maxBatchSize, 150);
            assert.equal(config.maxBatchIntervalMs, 12000);
            assert.equal(config.disableAppInsights, false);
            assert.equal(config.samplingPercentage, 30);
            assert.equal(config.correlationHeaderExcludedDomains[0], "domain1");
            assert.equal(config.correlationHeaderExcludedDomains[1], "domain2");
            assert.equal(config.proxyHttpUrl, "testProxyHttpUrl");
            assert.equal(config.proxyHttpsUrl, "testProxyHttpsUrl");
            assert.equal(config.ignoreLegacyHeaders, false);
            assert.equal(config.enableAutoCollectExternalLoggers, false);
            assert.equal(config.enableAutoCollectConsole, false);
            assert.equal(config.enableAutoCollectExceptions, false);
            assert.equal(config.enableAutoCollectPerformance, false);
            assert.equal(config.enableAutoCollectPreAggregatedMetrics, false);
            assert.equal(config.enableAutoCollectHeartbeat, false);
            assert.equal(config.enableAutoCollectRequests, false);
            assert.equal(config.enableAutoCollectDependencies, false);
            assert.equal(config.enableAutoDependencyCorrelation, false);
            assert.equal(config.enableAutoCollectIncomingRequestAzureFunctions, false);
            assert.equal(config.enableUseAsyncHooks, false);
            assert.equal(config.enableAutoCollectExtendedMetrics, false);
            assert.equal(config.noHttpAgentKeepAlive, false);
            assert.equal(config.distributedTracingMode, 0);
            assert.equal(config.enableUseDiskRetryCaching, false);
            assert.equal(config.enableResendInterval, 123);
            assert.equal(config.enableMaxBytesOnDisk, 456);
            assert.equal(config.enableInternalDebugLogging, false);
            assert.equal(config.enableInternalWarningLogging, false);
            assert.equal(config.enableSendLiveMetrics, false);
            assert.equal(config.extendedMetricDisablers, "gc,heap");
            assert.equal(config.noDiagnosticChannel, false);
            assert.equal(config.noPatchModules, "console,redis");
            assert.equal(config.quickPulseHost, "testquickpulsehost.com");
            assert.equal(config.enableWebInstrumentation, true);
            assert.equal(config.webInstrumentationConnectionString, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3330;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            assert.deepEqual(config.webInstrumentationConfig, [{ name: "key1", value: "key1" }, { name: "key2", value: true }],);
            assert.equal(config.webInstrumentationSrc, "webInstrumentationSourceFromJson");
        });
    });
});
