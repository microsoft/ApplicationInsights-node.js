import assert = require("assert");
import sinon = require("sinon");
import * as types from "../../Bootstrap/Default";

const appInsights = require("../../applicationinsights");

class LoggerSpy implements types.AgentLogger {
    public logCount = 0
    public errorCount = 0;

    public log() {
        this.logCount++;
    }
    public error() {
        this.errorCount++;
    }
}

describe("#setupAndStart()", () => {
    const startSpy = sinon.spy(appInsights, "start");

    before(() => {
        startSpy.reset();
    });

    afterEach(() => {
        startSpy.reset();
        delete require.cache[require.resolve("../../Bootstrap/Default")];
    });

    after(() => {
        startSpy.restore();
    });

    it("should setup and start the SDK", () => {
        // Setup env vars before requiring loader
        const logger = new LoggerSpy();
        const origEnv = process.env.APPLICATIONINSIGHTS_EXTENSION_VERSION;
        process.env.APPLICATIONINSIGHTS_EXTENSION_VERSION = "~2";

        // Test
        const Default = require("../../Bootstrap/Default") as typeof types;
        Default.setLogger(logger);
        const instance = Default.setupAndStart("abc");
        assert.deepEqual(instance, appInsights);

        // Cleanup
        instance.dispose();
        process.env.APPLICATIONINSIGHTS_EXTENSION_VERSION = origEnv;

        // start was called once
        assert.equal(startSpy.callCount, 1);

        // No logging was done
        assert.equal(logger.logCount, 0);
        assert.equal(logger.errorCount, 0);
    });

    it("should not setup and start the SDK if it has been disabled", () => {
        // Setup
        const logger = new LoggerSpy();
        const origEnv = process.env.APPLICATIONINSIGHTS_EXTENSION_VERSION;
        process.env.APPLICATIONINSIGHTS_EXTENSION_VERSION = "disabled";

        // Test
        const Default = require("../../Bootstrap/Default") as typeof types;
        Default.setLogger(logger);
        const instance = Default.setupAndStart("abc");
        assert.equal(instance, null);

        // Cleanup
        process.env.APPLICATIONINSIGHTS_EXTENSION_VERSION = origEnv;

        // start was never called
        assert.equal(startSpy.callCount, 0);

        // No logging was done
        assert.equal(logger.logCount, 0);
        assert.equal(logger.errorCount, 0, "Do not log if attach is disabled");
    });

    it("should not setup and start the SDK if no setupString is provided", () => {
        // Setup
        const logger = new LoggerSpy();
        const origEnv = process.env.APPLICATIONINSIGHTS_EXTENSION_VERSION;
        process.env.APPLICATIONINSIGHTS_EXTENSION_VERSION = "~2";

        // Test
        const Default = require("../../Bootstrap/Default") as typeof types;
        Default.setLogger(logger);
        const instance = Default.setupAndStart();
        assert.equal(instance, null);

        // Cleanup
        process.env.APPLICATIONINSIGHTS_EXTENSION_VERSION = origEnv;

        // start was never called
        assert.equal(startSpy.callCount, 0);

        // No logging was done
        assert.equal(logger.logCount, 0);
        assert.equal(logger.errorCount, 1, "Should log if attach is attempted");
    });
});
