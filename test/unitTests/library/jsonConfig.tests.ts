import * as assert from "assert";
import * as sinon from "sinon";
import * as fs from "fs";
import * as path from "path";
import { JsonConfig } from "../../../src/library/configuration";

describe("Json Config", () => {
    var sandbox: sinon.SinonSandbox;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = process.env;
        sandbox = sinon.createSandbox();
        JsonConfig["_instance"] = undefined;
    });

    afterEach(() => {
        process.env = originalEnv;
        sandbox.restore();
    });

    after(() => {
        JsonConfig["_instance"] = undefined;
    });

    describe("config path", () => {
        it("Default file path", () => {
            let fileSpy = sandbox.spy(fs, "readFileSync");
            const config = JsonConfig.getInstance();
            config["_loadJsonFile"]();
            assert.ok(fileSpy.called);
            let defaultPath = path.resolve(process.cwd(), "applicationinsights.json");
            assert.equal(fileSpy.args[0][0], defaultPath);
        });

        it("Absolute file path", () => {
            const env = <{ [id: string]: string }>{};
            const customConfigJSONPath = path.resolve(
                __dirname,
                "../../../../test/unitTests/library/config.json"
            );
            env["APPLICATIONINSIGHTS_CONFIGURATION_FILE"] = customConfigJSONPath;
            process.env = env;
            const config = JsonConfig.getInstance();
            assert.equal(
                config.connectionString,
                "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/"
            );
        });

        it("Relative file path", () => {
            const env = <{ [id: string]: string }>{};
            const customConfigJSONPath = "./test/unitTests/library/config.json";
            env["APPLICATIONINSIGHTS_CONFIGURATION_FILE"] = customConfigJSONPath;
            process.env = env;
            const config = JsonConfig.getInstance();
            assert.equal(
                config.connectionString,
                "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/"
            );
        });
    });

    describe("configuration values", () => {
        it("Should take configurations from JSON config file", () => {
            const env = <{ [id: string]: string }>{};
            const customConfigJSONPath = path.resolve(
                __dirname,
                "../../../../test/unitTests/library/config.json"
            );
            env["APPLICATIONINSIGHTS_CONFIGURATION_FILE"] = customConfigJSONPath;
            process.env = env;
            const config = JsonConfig.getInstance();
            assert.equal(
                config.connectionString,
                "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/"
            );
            assert.equal(config.endpointUrl, "testEndpointUrl");
            assert.equal(config.samplingPercentage, 30);
            assert.equal(config.enableAutoCollectExternalLoggers, false);
            assert.equal(config.enableAutoCollectConsole, false);
            assert.equal(config.enableAutoCollectExceptions, false);
            assert.equal(config.enableAutoCollectPerformance, false);
            assert.equal(config.enableAutoCollectPreAggregatedMetrics, false);
            assert.equal(config.enableAutoCollectHeartbeat, false);
            assert.equal(config.disableStatsbeat, false);
            assert.equal(config.enableAutoCollectExtendedMetrics, false);
            assert.equal(config.disableStatsbeat, false);
            assert.equal(config.enableSendLiveMetrics, false);
            assert.equal(config.extendedMetricDisablers, "gc,heap");
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
            assert.equal(config.extendedMetricDisablers, "gc");
            assert.equal(config.disableAllExtendedMetrics, true);
            assert.equal(config.disableStatsbeat, true);
        });

        it("Should take configurations from JSON config file over environment variables if both are configured", () => {
            const env = <{ [id: string]: string }>{};
            const customConfigJSONPath = path.resolve(
                __dirname,
                "../../../../test/unitTests/library/config.json"
            );
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
            assert.equal(
                config.connectionString,
                "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/"
            );
            assert.equal(config.extendedMetricDisablers, "gc,heap");
            assert.equal(config.disableAllExtendedMetrics, false);
            assert.equal(config.disableStatsbeat, false);
        });
    });
});
