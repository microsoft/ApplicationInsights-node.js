import assert = require("assert");
import sinon = require("sinon");
import path = require("path");
import AppInsights = require("../../applicationinsights");
import { JsonConfig } from "../../Library/JsonConfig";
import Config = require("../../Library/Config");

const APPLICATION_INSIGHTS_CONFIG_PATH = "APPLICATION_INSIGHTS_CONFIG_PATH";
const ENV_connectionString = "APPLICATIONINSIGHTS_CONNECTION_STRING";
const ENV_http_proxy = "http_proxy";
const ENV_https_proxy = "https_proxy";
const ENV_noStatsbeat = "APPLICATION_INSIGHTS_NO_STATSBEAT";

describe("Custom Config", () => {
    var sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
        JsonConfig["_jsonConfig"] = undefined;
    });

    afterEach(() => {
        AppInsights.dispose();
        sandbox.restore();
    });

    describe("config path", () => {
        it("Should take configurations from custom config file", () => {
            const env = <{ [id: string]: string }>{};
            const originalEnv = process.env;
    
            const customConfigJSONPath = path.resolve(__dirname, "../../../Tests/Config", "./config.json");
            env[APPLICATION_INSIGHTS_CONFIG_PATH] = customConfigJSONPath;
            process.env = env;
            AppInsights.setup().start();

            const config = new Config();
            assert.deepEqual(config.instrumentationKey, "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            assert.deepEqual(config.endpointUrl, "testEndpointUrl/v2.1/track");
            assert.deepEqual(config.maxBatchSize, 150);
            assert.deepEqual(config.maxBatchIntervalMs, 12000);
            assert.deepEqual(config.disableAppInsights, false);
            assert.deepEqual(config.samplingPercentage, 30);
            assert.deepEqual(config.correlationIdRetryIntervalMs, 15000);
            assert.deepEqual(config.correlationHeaderExcludedDomains, ["domain1", "domain2"]);
            assert.deepEqual(config.proxyHttpUrl, "testProxyHttpUrl");
            assert.deepEqual(config.proxyHttpsUrl, "testProxyHttpsUrl");
            assert.deepEqual(config.ignoreLegacyHeaders, true);
            assert.deepEqual(config.enableAutoCollectExternalLoggers, false);
            assert.deepEqual(config.enableAutoCollectConsole, false);
            assert.deepEqual(config.enableAutoCollectExceptions, false);
            assert.deepEqual(config.enableAutoCollectPerformance, false);
            assert.deepEqual(config.enableAutoCollectPreAggregatedMetrics, false);
            assert.deepEqual(config.enableAutoCollectHeartbeat, false);
            assert.deepEqual(config.enableAutoCollectRequests, false);
            assert.deepEqual(config.enableAutoCollectDependencies, false);
            assert.deepEqual(config.enableAutoDependencyCorrelation, false);
            assert.deepEqual(config.enableUseAsyncHooks, false);
            assert.deepEqual(config.disableStatsbeat, false);

            process.env = originalEnv;
        });

        it("Should take configurations from custom config file over environment variable if both are configured", () => {
            const env = <{ [id: string]: string }>{};
            const originalEnv = process.env;
    
            const customConfigJSONPath = path.resolve(__dirname, "../../../Tests/Config", "./config.json");
            env[APPLICATION_INSIGHTS_CONFIG_PATH] = customConfigJSONPath;
            env[ENV_connectionString] = "InstrumentationKey=2bb22222-cccc-2ddd-9eee-ffffgggg4444;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/";
            env[ENV_http_proxy] = "testProxyHttpUrl2";
            env[ENV_https_proxy] = "testProxyHttpsUrl2";
            env[ENV_noStatsbeat] = "true";
            process.env = env;

            // sandbox.stub(AppInsights['defaultClient'].config, '_jsonConfig').returns(new JsonConfig());
            AppInsights.setup().start();

            const config = new Config();
            assert.deepEqual(config.instrumentationKey, "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            assert.deepEqual(config.proxyHttpUrl, "testProxyHttpUrl");
            assert.deepEqual(config.proxyHttpsUrl, "testProxyHttpsUrl");
            assert.deepEqual(config.disableStatsbeat, false);           

            process.env = originalEnv;
        });
    });
});
