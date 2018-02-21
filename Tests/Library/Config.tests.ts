import assert = require("assert");
import sinon = require("sinon");

import Config = require("../../Library/Config");

describe("Library/Config", () => {

    var iKey = "iKey";
    var appVer = "appVer";

    describe("#constructor(iKey)", () => {
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
        });

        it("should initialize values that we claim in README", () => {
            var config = new Config("iKey");
            assert(config.maxBatchSize === 250);
            assert(config.maxBatchIntervalMs === 15000);
            assert(config.disableAppInsights === false);
            assert(config.samplingPercentage === 100);
            assert(config.correlationIdRetryIntervalMs === 30000);
        });

        it("should add azure domain to excluded list", () => {
            var config = new Config("iKey");
            assert.equal(config.correlationHeaderExcludedDomains[0].toString(), "*.core.windows.net");
        });
    });
});
