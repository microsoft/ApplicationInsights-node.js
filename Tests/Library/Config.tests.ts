import assert = require("assert");
import sinon = require("sinon");
var http = require("http");
var https = require("https");

import Config = require("../../Library/Config");
import Constants = require("../../Declarations/Constants");

describe("Library/Config", () => {

    var iKey = "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
    var appVer = "appVer";

    describe("#constructor", () => {
        describe("connection string && API && environment variable prioritization", () => {
            it ("connection string set via in code setup", () => {
                var env = { [Config.ENV_connectionString]: "InStruMenTatioNKey=cs.env", [Config.ENV_iKey]: "ikey.env"};
                var originalEnv = process.env;
                process.env = env;
                const config = new Config("InStruMenTatioNKey=cs.code");
                assert.deepEqual(config.instrumentationKey, "cs.code");
                process.env = originalEnv;
            });

            it("instrumentation key set via in code setup", () => {
                var env = { [Config.ENV_connectionString]: "InStruMenTatioNKey=CS.env", [Config.ENV_iKey]: "ikey.env"};
                var originalEnv = process.env;
                process.env = env;
                const config = new Config("ikey.code");
                assert.deepEqual(config.instrumentationKey, "ikey.code");
                process.env = originalEnv;
            });

            it("connection string set via environment variable", () => {
                var env = { [Config.ENV_connectionString]: "InStruMenTatioNKey=cs.env", [Config.ENV_iKey]: "ikey.env"};
                var originalEnv = process.env;
                process.env = env;
                const config = new Config();
                assert.deepEqual(config.instrumentationKey, "cs.env");
                process.env = originalEnv;
            });

            it("instrumentation key set via environment variable", () => {
                var env = { [Config.ENV_iKey]: "ikey.env"};
                var originalEnv = process.env;
                process.env = env;
                const config = new Config();
                assert.deepEqual(config.instrumentationKey, "ikey.env");
                process.env = originalEnv;
            });

            it("should parse the host of livemetrics host, if provided", () => {
                const config = new Config("InStruMenTatioNKey=ikey;LiveEndpoint=https://live.applicationinsights.io/foo/bar");
                assert.deepEqual(config.quickPulseHost, "live.applicationinsights.io");
            });

            it("should parse the host of livemetrics host from location+suffix, if provided", () => {
                const config = new Config("InStruMenTatioNKey=ikey;Location=wus2;EndpointSuffix=example.com");
                assert.deepEqual(config.quickPulseHost, "wus2.live.example.com");
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

                assert(config.quickPulseHost === Constants.DEFAULT_LIVEMETRICS_HOST);
            });

            it("should initialize values that we claim in README (2)", () => {
                process.env.http_proxy = "test";
                process.env.https_proxy = "test2";
                var config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert(config.proxyHttpUrl === "test");
                assert(config.proxyHttpsUrl === "test2");
            });

            it("should add azure domain to excluded list", () => {
                var config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert.equal(config.correlationHeaderExcludedDomains[0].toString(), "*.core.windows.net");
            });

            it("instrumentation key validation-valid key passed", () => {
                var warnStub = sinon.stub(console, "warn");
                var config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert.ok(warnStub.notCalled, "warning was not raised");
                warnStub.restore();
            });

            it("instrumentation key validation-invalid key passed", () => {
                var warnStub = sinon.stub(console, "warn");
                var config = new Config("1aa11111bbbb1ccc8dddeeeeffff3333");
                assert.ok(warnStub.calledOn, "warning was raised");
                warnStub.restore();
            });

            it("instrumentation key validation-invalid key passed", () => {
                var warnStub = sinon.stub(console, "warn");
                var config = new Config("abc");
                assert.ok(warnStub.calledOn, "warning was raised");
                warnStub.restore();
            });

        });
    });
});
