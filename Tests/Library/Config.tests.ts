///<reference path="..\..\typings\globals\node\index.d.ts" />
///<reference path="..\..\typings\globals\mocha\index.d.ts" />
///<reference path="..\..\typings\globals\sinon\index.d.ts" />

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
            var env = {};
            env[Config.ENV_iKey] = iKey;
            var originalEnv = process.env;
            process.env = env;
            var config = new Config();
            assert.equal(config.instrumentationKey, iKey);
            process.env = originalEnv;
        });

        it("should read iKey from azure environment", () => {
            var env = {};
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
            assert(typeof config.sessionRenewalMs === "number");
            assert(typeof config.sessionExpirationMs === "number");
            assert(typeof config.maxBatchSize === "number");
            assert(typeof config.maxBatchIntervalMs === "number");
            assert(typeof config.disableAppInsights === "boolean");
        });

        it("should add azure blob storage domain to excluded list", () => {
            var config = new Config("iKey");
            assert.equal(config.correlationHeaderExcludedDomains[0].toString(), /^[^\.]+\.blob\.core\.windows\.net/g.toString());
        });
    });
});