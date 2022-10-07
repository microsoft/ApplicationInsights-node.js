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
                assert.equal(config.endpointUrl, "testEndpointUrl/v2.1/track");
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
        });

        describe("constructor(ikey)", () => {
            beforeEach(() => {
                sandbox.stub(http, "request");
                sandbox.stub(https, "request");
            });

            it("should throw if no iKey is available", () => {
                var env = {};
                process.env = env;
                assert.throws(() => new Config());
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
