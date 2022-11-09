import * as assert from "assert";
import * as sinon from "sinon";
import * as fs from "fs";
import * as path from "path";
import { JsonConfig } from "../../../src/shared/configuration/jsonConfig";

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
                "../../../../test/unitTests/shared/config.json"
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
            const customConfigJSONPath = "./test/unitTests/shared/config.json";
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
                "../../../../test/unitTests/shared/config.json"
            );
            env["APPLICATIONINSIGHTS_CONFIGURATION_FILE"] = customConfigJSONPath;
            process.env = env;
            const config = JsonConfig.getInstance();
            assert.equal(
                config.connectionString,
                "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/"
            );
            assert.equal(config.samplingRate, 0.3, "Wrong samplingRate");
            assert.equal(
                config.enableAutoCollectExceptions,
                false,
                "Wrong enableAutoCollectExceptions"
            );
            assert.equal(
                config.enableAutoCollectPerformance,
                false,
                "Wrong enableAutoCollectPerformance"
            );
            assert.equal(
                config.enableAutoCollectStandardMetrics,
                false,
                "Wrong enableAutoCollectStandardMetrics"
            );
            assert.equal(
                config.enableAutoCollectHeartbeat,
                false,
                "Wrong enableAutoCollectHeartbeat"
            );
            assert.equal(config.extendedMetrics.loop, true, "Wrong loop");
            assert.equal(config.extendedMetrics.gc, true, "Wrong gc");
            assert.equal(config.extendedMetrics.heap, true, "Wrong heap");
            assert.equal(config.instrumentations.azureSdk.enabled, true, "Wrong azureSdk");
            assert.equal(config.instrumentations.mongoDb.enabled, true, "Wrong mongoDb");
            assert.equal(config.instrumentations.mySql.enabled, true, "Wrong mySql");
            assert.equal(config.instrumentations.postgreSql.enabled, true, "Wrong postgreSql");
            assert.equal(config.instrumentations.redis.enabled, true, "Wrong redis");
            assert.equal(config.instrumentations.redis4.enabled, true, "Wrong redis4");
            assert.equal(config.logInstrumentations.console.enabled, true, "Wrong console");
            assert.equal(config.logInstrumentations.bunyan.enabled, true, "Wrong bunyan");
            assert.equal(config.logInstrumentations.winston.enabled, true, "Wrong winston");
        });

        it("Should take configurations from JSON config file over environment variables if both are configured", () => {
            const env = <{ [id: string]: string }>{};
            const customConfigJSONPath = path.resolve(
                __dirname,
                "../../../../test/unitTests/shared/config.json"
            );
            env["APPLICATIONINSIGHTS_CONFIGURATION_FILE"] = customConfigJSONPath;
            env["APPLICATIONINSIGHTS_CONNECTION_STRING"] = "TestConnectionString";
            process.env = env;
            const config = JsonConfig.getInstance();
            assert.equal(
                config.connectionString,
                "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/"
            );
        });
    });
});
