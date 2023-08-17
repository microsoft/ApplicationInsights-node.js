import assert = require("assert");
import sinon = require("sinon");
import { ShimJsonConfig } from "../../../src/shim/shim-jsonConfig";
import path = require("path");

describe("Json Config", () => {
    let sandbox: sinon.SinonSandbox;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = process.env;
        sandbox = sinon.createSandbox();
        // ShimJsonConfig["_instance"] = undefined;
    });

    afterEach(() => {
        process.env = originalEnv;
        sandbox.restore();
    });

    after(() => {
        // ShimJsonConfig["_instance"] = undefined;
    });

    describe("configuration values", () => {
        /*
        const cutstomConfigJsonPath = path.resolve(__dirname, "C:/Users/weber/Repositories/ApplicationInsights-node.js/test/unitTests/shim/config.json");
        console.log("JSON PATH: ", cutstomConfigJsonPath);
        process.env["APPLICATIONINSIGHTS_CONFIGURATION_FILE"] = cutstomConfigJsonPath;
        console.log("ENV VAR: ", process.env.APPLICATIONINSIGHTS_CONFIGURATION_FILE);
        const config = ShimJsonConfig.getInstance();
        assert.equal(config.connectionString, "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
        */
    });
});