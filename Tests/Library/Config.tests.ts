import assert = require("assert");
import path = require("path");
import sinon = require("sinon");
var http = require("http");
var https = require("https");
import Config = require("../../Library/Config");
import Constants = require("../../Declarations/Constants");

import { JsonConfig } from "../../Library/JsonConfig";

const ENV_connectionString = "APPLICATIONINSIGHTS_CONNECTION_STRING";

describe("Library/Config", () => {

    var iKey = "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
    let originalEnv: NodeJS.ProcessEnv;
    var sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        originalEnv = process.env;
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        process.env = originalEnv;
        sandbox.restore();
        JsonConfig["_instance"] = undefined;
    });

    describe("#constructor", () => {
        describe("connection string && API && environment variable prioritization", () => {
            it("connection string set via in code setup", () => {
                var env = { [ENV_connectionString]: "InStruMenTatioNKey=cs.env", [Config.ENV_iKey]: "ikey.env" };
                process.env = env;
                const config = new Config("InStruMenTatioNKey=cs.code");
                assert.deepEqual(config.instrumentationKey, "cs.code");
            });

            it("instrumentation key set via in code setup", () => {
                var env = { [ENV_connectionString]: "InStruMenTatioNKey=CS.env", [Config.ENV_iKey]: "ikey.env" };
                process.env = env;
                const config = new Config("ikey.code");
                assert.deepEqual(config.instrumentationKey, "ikey.code");
            });

            it("connection string set via environment variable", () => {
                var env = { [ENV_connectionString]: "InStruMenTatioNKey=cs.env", [Config.ENV_iKey]: "ikey.env" };
                process.env = env;
                const config = new Config();
                assert.deepEqual(config.instrumentationKey, "cs.env");
            });

            it("instrumentation key set via environment variable", () => {
                var env = { [Config.ENV_iKey]: "ikey.env" };
                process.env = env;
                const config = new Config();
                assert.deepEqual(config.instrumentationKey, "ikey.env");
            });

            it("should parse the host of livemetrics host, if provided", () => {
                const config = new Config("InStruMenTatioNKey=ikey;LiveEndpoint=https://live.applicationinsights.io/foo/bar");
                assert.deepEqual(config.quickPulseHost, "live.applicationinsights.io");
            });

            it("should parse the host of livemetrics host from location+suffix, if provided", () => {
                const config = new Config("InStruMenTatioNKey=ikey;Location=wus2;EndpointSuffix=example.com");
                assert.deepEqual(config.quickPulseHost, "wus2.live.example.com");
            });

            it("merge JSON config", () => {
                JsonConfig["_instance"] = undefined;
                const env = <{ [id: string]: string }>{};
                const customConfigJSONPath = path.resolve(__dirname, "../../../Tests/Library/config.json");
                env["APPLICATIONINSIGHTS_CONFIGURATION_FILE"] = customConfigJSONPath; // Load JSON config
                process.env = env;
                const config = new Config();
                assert.equal(config["_connectionString"], "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
                assert.equal(config.endpointUrl, "testEndpointUrl/v2.1/track");
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
                assert.equal(config.distributedTracingMode, 0);
                assert.equal(config.enableUseDiskRetryCaching, false);
                assert.equal(config.enableResendInterval, 123);
                assert.equal(config.enableMaxBytesOnDisk, 456);
                assert.equal(config.enableInternalDebugLogging, false);
                assert.equal(config.disableStatsbeat, false);
                assert.equal(config.enableInternalWarningLogging, false);
                assert.equal(config.enableSendLiveMetrics, false);
                assert.equal(config.extendedMetricDisablers, "gc,heap");
                assert.equal(config.quickPulseHost, "testquickpulsehost.com");
                assert.equal(config.enableAutoWebSnippetInjection, false);
                assert.equal(config.webSnippetConnectionString, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3331;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            });
        });

        describe("constructor(ikey)", () => {
            beforeEach(() => {
                sinon.stub(http, 'request');
                sinon.stub(https, 'request');
            });
            afterEach(() => {
                http.request.restore();
                https.request.restore();
            });
            it("should throw if no iKey is available", () => {
                var env = {};
                process.env = env;
                assert.throws(() => new Config());
            });

            it("should read iKey from environment", () => {
                var env = <{ [id: string]: string }>{};
                env[Config.ENV_iKey] = iKey;
                process.env = env;
                var config = new Config();
                assert.equal(config.instrumentationKey, iKey);
            });

            it("should read iKey from azure environment", () => {
                var env = <{ [id: string]: string }>{};
                env[Config.ENV_azurePrefix + Config.ENV_iKey] = iKey;
                process.env = env;
                var config = new Config();
                assert.equal(config.instrumentationKey, iKey);
            });

            it("should read enableWebSnippet from environment variables", () => {
                var env = <{ [id: string]: string }>{};
                env["APPLICATIONINSIGHTS_WEB_SNIPPET_ENABLED"] = "true";
                process.env = env;
                var config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert.equal(config.enableAutoWebSnippetInjection, true);
            });

            it("should read webSnippetConnectionString from environment variables", () => {
                var env = <{ [id: string]: string }>{};
                env["APPLICATIONINSIGHTS_WEB_SNIPPET_CONNECTION_STRING"] = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3330;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/";
                process.env = env;
                var config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert.equal(config.webSnippetConnectionString, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3330;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            });

            it("should initialize valid values", () => {
                var config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert(typeof config.instrumentationKey === "string");
                assert(typeof config.endpointUrl === "string");
                assert(typeof config.maxBatchSize === "number");
                assert(typeof config.maxBatchIntervalMs === "number");
                assert(typeof config.disableAppInsights === "boolean");
                assert(typeof config.samplingPercentage === "number");
                assert(typeof config.correlationIdRetryIntervalMs === "number");
                assert(typeof config.correlationHeaderExcludedDomains === "object");
                assert(typeof config.quickPulseHost === "string");
            });

            it("should initialize values that we claim in README", () => {
                var config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert(config.maxBatchSize === 250);
                assert(config.maxBatchIntervalMs === 15000);
                assert(config.disableAppInsights === false);
                assert(config.samplingPercentage === 100);
                assert(config.correlationIdRetryIntervalMs === 30000);
                assert(config.proxyHttpUrl === undefined);
                assert(config.proxyHttpsUrl === undefined);
                assert(config.enableAutoWebSnippetInjection === false);
                assert(config.webSnippetConnectionString === "");

                assert.equal(config.quickPulseHost, Constants.DEFAULT_LIVEMETRICS_HOST);
            });

            it("should initialize values that we claim in README (2)", () => {
                process.env.http_proxy = "test";
                process.env.https_proxy = "test2";
                JsonConfig["_instance"] = undefined;
                var config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert(config.proxyHttpUrl === "test");
                assert(config.proxyHttpsUrl === "test2");
                delete process.env.http_proxy;
                delete process.env.https_proxy;
            });

            it("should add azure domain to excluded list", () => {
                var config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert.equal(config.correlationHeaderExcludedDomains[0].toString(), "*.core.windows.net");
            });

            it("instrumentation key validation-valid key passed", () => {
                var warnStub = sandbox.stub(console, "warn");
                var config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert.ok(warnStub.notCalled, "warning was not raised");
            });

            it("instrumentation key validation-invalid key passed", () => {
                var warnStub = sandbox.stub(console, "warn");
                var config = new Config("1aa11111bbbb1ccc8dddeeeeffff3333");
                assert.ok(warnStub.calledOn, "warning was raised");
            });

            it("instrumentation key validation-invalid key passed", () => {
                var warnStub = sandbox.stub(console, "warn");
                var config = new Config("abc");
                assert.ok(warnStub.calledOn, "warning was raised");
            });

        });
    });
});
