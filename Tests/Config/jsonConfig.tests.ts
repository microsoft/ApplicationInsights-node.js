import assert = require("assert");
import sinon = require("sinon");
import path = require("path");
import AppInsights = require("../../applicationinsights");
import { JsonConfig } from "../../Library/JsonConfig";
import Config = require("../../Library/Config");


describe("Custom Config", () => {
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

    describe("config path", () => {
        it("Should take configurations from custom config file", () => {
            const env = <{ [id: string]: string }>{};
            const customConfigJSONPath = path.resolve(__dirname, "../../../Tests/Config", "./config.json");
            env["APPLICATION_INSIGHTS_CONFIG_PATH"] = customConfigJSONPath;
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
            assert.equal(config.ignoreLegacyHeaders, true);
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
        });

        it("Should take configurations from custom config file over environment variable if both are configured", () => {
            const env = <{ [id: string]: string }>{};
            const customConfigJSONPath = path.resolve(__dirname, "../../../Tests/Config", "./config.json");
            env["APPLICATION_INSIGHTS_CONFIG_PATH"] = customConfigJSONPath;
            env["APPLICATIONINSIGHTS_CONNECTION_STRING"] = "InstrumentationKey=2bb22222-cccc-2ddd-9eee-ffffgggg4444;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/";
            env["http_proxy"] = "testProxyHttpUrl2";
            env["https_proxy"] = "testProxyHttpsUrl2";
            env["APPLICATION_INSIGHTS_NO_STATSBEAT"] = "true";
            process.env = env;
            const config = JsonConfig.getInstance();
            assert.equal(config.connectionString, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            assert.equal(config.proxyHttpUrl, "testProxyHttpUrl");
            assert.equal(config.proxyHttpsUrl, "testProxyHttpsUrl");
            assert.equal(config.disableStatsbeat, false);
        });
    });
});
