import assert = require("assert");
import sinon = require("sinon");
var http = require("http");
var https = require("https");

import Config = require("../../Library/Config");

describe("Library/Config", () => {

    var iKey = "iKey";
    var appVer = "appVer";

    describe("#constructor", () => {
        describe("connection string && API && environment variable prioritization", () => {
            it ("connection string set via in code setup", () => {
                var env = { [Config.ENV_connectionString]: "InStruMenTatioNKey=cs.env", [Config.ENV_iKey]: "ikey.env"};
                var originalEnv = process.env;
                process.env = env;
                const config = new Config("ikey.code", "InStruMenTatioNKey=cs.code");
                assert.deepEqual(config.instrumentationKey, "cs.code");
                process.env = originalEnv;
            });

            it("instrumentation key set via in code setup", () => {
                var env = { [Config.ENV_connectionString]: "InStruMenTatioNKey=CS.env", [Config.ENV_iKey]: "ikey.env"};
                var originalEnv = process.env;
                process.env = env;
                const config = new Config("ikey.code", null);
                assert.deepEqual(config.instrumentationKey, "ikey.code");
                process.env = originalEnv;
            });

            it("connection string set via environment variable", () => {
                var env = { [Config.ENV_connectionString]: "InStruMenTatioNKey=cs.env", [Config.ENV_iKey]: "ikey.env"};
                var originalEnv = process.env;
                process.env = env;
                const config = new Config(null, null);
                assert.deepEqual(config.instrumentationKey, "cs.env");
                process.env = originalEnv;
            });

            it("instrumentation key set via environment variable", () => {
                var env = { [Config.ENV_iKey]: "ikey.env"};
                var originalEnv = process.env;
                process.env = env;
                const config = new Config(null, null);
                assert.deepEqual(config.instrumentationKey, "ikey.env");
                process.env = originalEnv;
            });
        });

        describe("constructor(ikey)", () => {
            beforeEach(()=> {
                sinon.stub(http, 'request');
                sinon.stub(https, 'request');
            });
            afterEach(() => {
                http.request.restore();
                https.request.restore();
            });
            it("should throw if no iKey is available", () => {
                var env = {};
                var originalEnv = process.env;
                process.env = env;
                assert.throws(() => new Config());
                process.env = originalEnv;
            });

            it("should read iKey from environment", () => {
                var env = <{[id: string]: string}>{};
                env[Config.ENV_iKey] = iKey;
                var originalEnv = process.env;
                process.env = env;
                var config = new Config();
                assert.equal(config.instrumentationKey, iKey);
                process.env = originalEnv;
            });

            it("should read iKey from azure environment", () => {
                var env = <{[id: string]: string}>{};
                env[Config.ENV_azurePrefix + Config.ENV_iKey] = iKey;
                var originalEnv = process.env;
                process.env = env;
                var config = new Config();
                assert.equal(config.instrumentationKey, iKey);
                process.env = originalEnv;
            });

            it("should initialize valid values", () => {
                var config = new Config("iKey");
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
                var config = new Config("iKey");
                assert(config.maxBatchSize === 250);
                assert(config.maxBatchIntervalMs === 15000);
                assert(config.disableAppInsights === false);
                assert(config.samplingPercentage === 100);
                assert(config.correlationIdRetryIntervalMs === 30000);
                assert(config.proxyHttpUrl === undefined);
                assert(config.proxyHttpsUrl === undefined);

                assert(config.quickPulseHost === "rt.services.visualstudio.com");
            });

            it("should initialize values that we claim in README (2)", () => {
                process.env.http_proxy = "test";
                process.env.https_proxy = "test2";
                var config = new Config("iKey");
                assert(config.proxyHttpUrl === "test");
                assert(config.proxyHttpsUrl === "test2");
            });

            it("should add azure domain to excluded list", () => {
                var config = new Config("iKey");
                assert.equal(config.correlationHeaderExcludedDomains[0].toString(), "*.core.windows.net");
            });
        });
    });
});
