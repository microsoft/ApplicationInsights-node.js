import * as assert from "assert";
import * as path from "path";
import * as sinon from "sinon";
import * as http from "http";
import * as https from "https";

import { Config } from "../../../src/library/configuration";
import * as Constants from "../../../src/declarations/constants";
import { JsonConfig } from "../../../src/library/configuration";

const ENV_connectionString = "APPLICATIONINSIGHTS_CONNECTION_STRING";

describe("Library/Config", () => {
    var iKey = "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
    let originalEnv: NodeJS.ProcessEnv;
    var sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        originalEnv = process.env;
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        process.env = originalEnv;
        sandbox.restore();
        JsonConfig["_instance"] = undefined;
    });

    describe("#constructor", () => {
        describe("connection string && API && environment variable prioritization", () => {
            it("connection string set via in code setup", () => {
                var env = {
                    [ENV_connectionString]: "InStruMenTatioNKey=cs.env",
                    [Constants.ENV_IKEY]: "ikey.env",
                };
                process.env = env;
                const config = new Config("InStruMenTatioNKey=cs.code");
                assert.deepEqual(config.instrumentationKey, "cs.code");
            });

            it("instrumentation key set via in code setup", () => {
                var env = {
                    [ENV_connectionString]: "InStruMenTatioNKey=CS.env",
                    [Constants.ENV_IKEY]: "ikey.env",
                };
                process.env = env;
                const config = new Config("ikey.code");
                assert.deepEqual(config.instrumentationKey, "ikey.code");
            });

            it("connection string set via environment variable", () => {
                var env = {
                    [ENV_connectionString]: "InStruMenTatioNKey=cs.env",
                    [Constants.ENV_IKEY]: "ikey.env",
                };
                process.env = env;
                const config = new Config();
                assert.deepEqual(config.instrumentationKey, "cs.env");
            });

            it("instrumentation key set via environment variable", () => {
                var env = { [Constants.ENV_IKEY]: "ikey.env" };
                process.env = env;
                const config = new Config();
                assert.deepEqual(config.instrumentationKey, "ikey.env");
            });

            it("should parse the host of livemetrics host, if provided", () => {
                const config = new Config(
                    "InStruMenTatioNKey=ikey;LiveEndpoint=https://live.applicationinsights.io/foo/bar"
                );
                assert.deepEqual(config.quickPulseHost, "live.applicationinsights.io");
            });

            it("should parse the host of livemetrics host from location+suffix, if provided", () => {
                const config = new Config(
                    "InStruMenTatioNKey=ikey;Location=wus2;EndpointSuffix=example.com"
                );
                assert.deepEqual(config.quickPulseHost, "wus2.live.example.com");
            });

            it("merge JSON config", () => {
                JsonConfig["_instance"] = undefined;
                const env = <{ [id: string]: string }>{};
                const customConfigJSONPath = path.resolve(
                    __dirname,
                    "../../../../test/unitTests/library/config.json"
                );
                env["APPLICATIONINSIGHTS_CONFIGURATION_FILE"] = customConfigJSONPath; // Load JSON config
                process.env = env;
                const config = new Config();
                assert.equal(
                    config["_connectionString"],
                    "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/"
                );
                assert.equal(config.endpointUrl, "testEndpointUrl/v2.1/track", "Wrong endpointUrl");
                assert.equal(config.samplingPercentage, 30, "Wrong samplingPercentage");
                assert.equal(config.enableAutoCollectExternalLoggers, false, "Wrong enableAutoCollectExternalLoggers");
                assert.equal(config.enableAutoCollectConsole, true, "Wrong enableAutoCollectConsole");
                assert.equal(config.enableAutoCollectExceptions, false, "Wrong enableAutoCollectExceptions");
                assert.equal(config.enableAutoCollectPerformance, false, "Wrong enableAutoCollectPerformance");
                assert.equal(config.enableAutoCollectPreAggregatedMetrics, false, "Wrong enableAutoCollectPreAggregatedMetrics");
                assert.equal(config.enableAutoCollectHeartbeat, false, "Wrong enableAutoCollectHeartbeat");
                assert.equal(config.enableAutoCollectRequests, false, "Wrong enableAutoCollectRequests");
                assert.equal(config.enableAutoCollectDependencies, false, "Wrong enableAutoCollectDependencies");
                assert.equal(config.disableStatsbeat, false, "Wrong disableStatsbeat");
                assert.equal(config.enableSendLiveMetrics, false, "Wrong enableSendLiveMetrics");
                assert.equal(config.extendedMetrics.loop, true, "Wrong loop");
                assert.equal(config.extendedMetrics.gc, true, "Wrong gc");
                assert.equal(config.extendedMetrics.heap, true, "Wrong heap");
                assert.equal(config.quickPulseHost, "testquickpulsehost.com", "Wrong quickPulseHost");
                assert.equal(config.instrumentations.azureSdk.enabled, true, "Wrong azureSdk");
                assert.equal(config.instrumentations.mongoDb.enabled, true, "Wrong mongoDb");
                assert.equal(config.instrumentations.mySql.enabled, true, "Wrong mySql");
                assert.equal(config.instrumentations.postgreSql.enabled, true, "Wrong postgreSql");
                assert.equal(config.instrumentations.redis.enabled, true, "Wrong redis");
                assert.equal(config.instrumentations.redis4.enabled, true, "Wrong redis4");
            });

            it("Default config", () => {
                const config = new Config();
                assert.equal(config.endpointUrl, "https://dc.services.visualstudio.com/v2.1/track", "Wrong endpointUrl");
                assert.equal(config.samplingPercentage, 100, "Wrong samplingPercentage");
                assert.equal(config.enableAutoCollectExternalLoggers, true, "Wrong enableAutoCollectExternalLoggers");
                assert.equal(config.enableAutoCollectConsole, false, "Wrong enableAutoCollectConsole");
                assert.equal(config.enableAutoCollectExceptions, true, "Wrong enableAutoCollectExceptions");
                assert.equal(config.enableAutoCollectPerformance, true, "Wrong enableAutoCollectPerformance");
                assert.equal(config.enableAutoCollectPreAggregatedMetrics, true, "Wrong enableAutoCollectPreAggregatedMetrics");
                assert.equal(config.enableAutoCollectHeartbeat, true, "Wrong enableAutoCollectHeartbeat");
                assert.equal(config.enableAutoCollectRequests, true, "Wrong enableAutoCollectRequests");
                assert.equal(config.enableAutoCollectDependencies, true, "Wrong enableAutoCollectDependencies");
                assert.equal(config.disableStatsbeat, false, "Wrong disableStatsbeat");
                assert.equal(config.enableSendLiveMetrics, false, "Wrong enableSendLiveMetrics");
                assert.equal(config.extendedMetrics.loop, false, "Wrong loop");
                assert.equal(config.extendedMetrics.gc, false, "Wrong gc");
                assert.equal(config.extendedMetrics.heap, false, "Wrong heap");
                assert.equal(config.quickPulseHost, "rt.services.visualstudio.com", "Wrong quickPulseHost");
                assert.equal(config.instrumentations.azureSdk.enabled, false, "Wrong azureSdk");
                assert.equal(config.instrumentations.mongoDb.enabled, false, "Wrong mongoDb");
                assert.equal(config.instrumentations.mySql.enabled, false, "Wrong mySql");
                assert.equal(config.instrumentations.postgreSql.enabled, false, "Wrong postgreSql");
                assert.equal(config.instrumentations.redis.enabled, false, "Wrong redis");
                assert.equal(config.instrumentations.redis4.enabled, false, "Wrong redis4");
            });
        });

        describe("constructor(ikey)", () => {
            beforeEach(() => {
                sandbox.stub(http, "request");
                sandbox.stub(https, "request");
            });

            it("should read iKey from environment", () => {
                var env = <{ [id: string]: string }>{};
                env[Constants.ENV_IKEY] = iKey;
                process.env = env;
                var config = new Config();
                assert.equal(config.instrumentationKey, iKey);
            });

            it("should read iKey from azure environment", () => {
                var env = <{ [id: string]: string }>{};
                env[Constants.ENV_AZURE_PREFIX + Constants.ENV_IKEY] = iKey;
                process.env = env;
                var config = new Config();
                assert.equal(config.instrumentationKey, iKey);
            });

            it("should initialize valid values", () => {
                var config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert(typeof config.instrumentationKey === "string");
                assert(typeof config.endpointUrl === "string");
                assert(typeof config.samplingPercentage === "number");
                assert(typeof config.quickPulseHost === "string");
            });

            it("should initialize values that we claim in README", () => {
                var config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert(config.samplingPercentage === 100);

                assert.equal(config.quickPulseHost, Constants.DEFAULT_LIVEMETRICS_HOST);
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
