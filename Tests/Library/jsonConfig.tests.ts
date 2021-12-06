import assert = require("assert");
import sinon = require("sinon");
import fs = require("fs");
import path = require("path");
import AppInsights = require("../../applicationinsights");
import Logging = require("../../Library/Logging");
import { JsonConfig } from "../../Library/JsonConfig";


describe("Json Config", () => {
    var sandbox: sinon.SinonSandbox;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = process.env;
        sandbox = sinon.sandbox.create();
        JsonConfig["_instance"] = undefined;
    });

    afterEach(() => {
        process.env = originalEnv;
        AppInsights.dispose();
        sandbox.restore();
    });

    after(()=>{
        JsonConfig["_instance"] = undefined;
    });


    describe("config path", () => {
        it("Default file path", () => {
            let fileSpy = sandbox.spy(fs, "readFileSync");
            let loggerSpy = sandbox.spy(Logging, "info");
            const config = JsonConfig.getInstance();
            assert.equal(loggerSpy.callCount, 0);
            assert.equal(fileSpy.called, 1);
            let defaultPath = path.resolve(process.cwd(), "applicationinsights.json");
            assert.equal(fileSpy.args[0][0], defaultPath);
            assert.equal(config.proxyHttpUrl, undefined);
        });

        it("Absolute file path", () => {
            const env = <{ [id: string]: string }>{};
            const customConfigJSONPath = path.resolve(__dirname, "../../../Tests/Library/config.json");
            env["APPLICATIONINSIGHTS_CONFIGURATION_FILE"] = customConfigJSONPath;
            process.env = env;
            const config = JsonConfig.getInstance();
            assert.equal(config.connectionString, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
        });

        it("Relative file path", () => {
            const env = <{ [id: string]: string }>{};
            const customConfigJSONPath = "./Tests/Library/config.json";
            env["APPLICATIONINSIGHTS_CONFIGURATION_FILE"] = customConfigJSONPath;
            process.env = env;
            const config = JsonConfig.getInstance();
            assert.equal(config.connectionString, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
        });
    });

    describe("configuration values", () => {
        it("Should take configurations from JSON config file", () => {
            const env = <{ [id: string]: string }>{};
            const customConfigJSONPath = path.resolve(__dirname, "../../../Tests/Library/config.json");
            env["APPLICATIONINSIGHTS_CONFIGURATION_FILE"] = customConfigJSONPath;
            process.env = env;
            const config = JsonConfig.getInstance();
            assert.equal(config.connectionString, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            assert.equal(config.endpointUrl, "testEndpointUrl");
            assert.equal(config.maxBatchSize, 150);
            assert.equal(config.maxBatchIntervalMs, 12000);
            assert.equal(config.disableAppInsights, false);
            assert.equal(config.samplingPercentage, 30);
            assert.equal(config.correlationIdRetryIntervalMs, 15000);
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
            assert.equal(config.enableUseAsyncHooks, false);
            assert.equal(config.disableStatsbeat, false);
            assert.equal(config.enableAutoCollectExtendedMetrics, false);
            assert.equal(config.noHttpAgentKeepAlive, false);
            assert.equal(config.distributedTracingMode, 0);
            assert.equal(config.enableUseDiskRetryCaching, false);
            assert.equal(config.enableResendInterval, 123);
            assert.equal(config.enableMaxBytesOnDisk, 456);
            assert.equal(config.enableInternalDebugLogging, false);
            assert.equal(config.disableStatsbeat, false);
            assert.equal(config.enableInternalWarningLogging, false);
            assert.equal(config.enableSendLiveMetrics, false);
            assert.equal(config.extendedMetricDisablers, "gc,heap");
            assert.equal(config.noDiagnosticChannel, false);
            assert.equal(config.noPatchModules, "console,redis");
            assert.equal(config.quickPulseHost, "testquickpulsehost.com");
        });

        it("Should take configurations from environment variables", () => {
            const env = <{ [id: string]: string }>{};
            env["APPLICATIONINSIGHTS_CONNECTION_STRING"] = "TestConnectionString";
            env["APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC"] = "gc";
            env["APPLICATION_INSIGHTS_NO_PATCH_MODULES"] = "azuresdk";
            env["APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS"] = "true";
            env["APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL"] = "true";
            env["APPLICATION_INSIGHTS_NO_STATSBEAT"] = "true";
            env["APPLICATION_INSIGHTS_NO_HTTP_AGENT_KEEP_ALIVE"] = "true";
            env["http_proxy"] = "testProxyHttpUrl2";
            env["https_proxy"] = "testProxyHttpsUrl2";
            process.env = env;
            const config = JsonConfig.getInstance();
            assert.equal(config.connectionString, "TestConnectionString");
            assert.equal(config.proxyHttpUrl, "testProxyHttpUrl2");
            assert.equal(config.proxyHttpsUrl, "testProxyHttpsUrl2");
            assert.equal(config.extendedMetricDisablers, "gc");
            assert.equal(config.disableAllExtendedMetrics, true);
            assert.equal(config.noDiagnosticChannel, true);
            assert.equal(config.noHttpAgentKeepAlive, true);
            assert.equal(config.noPatchModules, "azuresdk");
            assert.equal(config.disableStatsbeat, true);
        });

        it("Should take configurations from JSON config file over environment variables if both are configured", () => {
            const env = <{ [id: string]: string }>{};
            const customConfigJSONPath = path.resolve(__dirname, "../../../Tests/Library/config.json");
            env["APPLICATIONINSIGHTS_CONFIGURATION_FILE"] = customConfigJSONPath;
            env["APPLICATIONINSIGHTS_CONNECTION_STRING"] = "TestConnectionString";
            env["APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC"] = "gc";
            env["APPLICATION_INSIGHTS_NO_PATCH_MODULES"] = "azuresdk";
            env["APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS"] = "true";
            env["APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL"] = "true";
            env["APPLICATION_INSIGHTS_NO_STATSBEAT"] = "true";
            env["APPLICATION_INSIGHTS_NO_HTTP_AGENT_KEEP_ALIVE"] = "true";
            env["http_proxy"] = "testProxyHttpUrl2";
            env["https_proxy"] = "testProxyHttpsUrl2";
            process.env = env;
            const config = JsonConfig.getInstance();
            assert.equal(config.connectionString, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            assert.equal(config.proxyHttpUrl, "testProxyHttpUrl");
            assert.equal(config.proxyHttpsUrl, "testProxyHttpsUrl");
            assert.equal(config.extendedMetricDisablers, "gc,heap");
            assert.equal(config.disableAllExtendedMetrics, false);
            assert.equal(config.noDiagnosticChannel, false);
            assert.equal(config.noHttpAgentKeepAlive, false);
            assert.equal(config.noPatchModules, "console,redis");
            assert.equal(config.disableStatsbeat, false);
        });
    });
});
