import assert = require("assert");
import sinon = require("sinon");

import Logging = require("../../Library/Logging");
import InternalAzureLogger = require("../../Library/InternalAzureLogger");

describe("Library/Logging", () => {

    var sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
        InternalAzureLogger["_instance"] = null;
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("Log to console", () => {
        it("should log message to console", () => {
            var env1 = <{ [id: string]: string }>{};
            env1["APPLICATIONINSIGHTS_LOG_DESTINATION"] = "console";
            var originalEnv = process.env;
            process.env = env1;
            Logging.enableDebug = true;
            var consoleStub = sandbox.stub(console, "log");
            Logging.info("test");
            process.env = originalEnv;
            assert.ok(consoleStub.called);
        });

        it("should not log message to console if disabled", () => {
            var env1 = <{ [id: string]: string }>{};
            env1["APPLICATIONINSIGHTS_LOG_DESTINATION"] = "file";
            var originalEnv = process.env;
            process.env = env1;
            Logging.enableDebug = true;
            var consoleStub = sandbox.stub(console, "log");
            Logging.info("test");
            process.env = originalEnv;
            assert.ok(consoleStub.notCalled);
        });
    });

    describe("#info(message, ...optionalParams: any)", () => {
        it("should do nothing if disabled", () => {
            var originalSetting = Logging.disableWarnings;
            Logging.enableDebug = false;
            var infoStub = sandbox.stub(InternalAzureLogger.getInstance().logger, "info");
            Logging.info("test");
            assert.ok(infoStub.notCalled);
            Logging.enableDebug = originalSetting;
        });

        it("should log 'info' if called", () => {
            var originalSetting = Logging.enableDebug;
            Logging.enableDebug = true;
            var infoStub = sandbox.stub(InternalAzureLogger.getInstance().logger, "info");
            Logging.info("test");
            assert.ok(infoStub.calledOnce);
            Logging.enableDebug = originalSetting;
        });
    });

    describe("#warn(message, ...optionalParams: any)", () => {
        it("should do nothing if disabled", () => {
            var originalSetting = Logging.disableWarnings;
            Logging.disableWarnings = true
            var warnStub = sandbox.stub(InternalAzureLogger.getInstance().logger, "warning");
            Logging.warn("test");
            assert.ok(warnStub.notCalled);
            Logging.enableDebug = originalSetting;
        });

        it("should log 'warn' if enabled", () => {
            var originalSetting = Logging.disableWarnings;
            Logging.disableWarnings = false;
            var warnStub = sandbox.stub(InternalAzureLogger.getInstance().logger, "warning");
            Logging.warn("test");
            assert.ok(warnStub.calledOnce);
            Logging.enableDebug = originalSetting;
        });
    });

    describe("Log to file", () => {
        it("should log message to file", () => {
            var env1 = <{ [id: string]: string }>{};
            env1["APPLICATIONINSIGHTS_LOG_DESTINATION"] = "file";
            var originalEnv = process.env;
            process.env = env1;
            Logging.enableDebug = true;
            var fileStub = sandbox.stub(InternalAzureLogger.getInstance(), "_storeToDisk");
            Logging.info("test");
            process.env = originalEnv;
            assert.ok(fileStub.called);
        });

        it("should not log message to file if disabled", () => {
            var env1 = <{ [id: string]: string }>{};
            env1["APPLICATIONINSIGHTS_LOG_DESTINATION"] = "console";
            var originalEnv = process.env;
            process.env = env1;
            Logging.enableDebug = true;
            var fileStub = sandbox.stub(InternalAzureLogger.getInstance(), "_storeToDisk");
            Logging.info("test");
            process.env = originalEnv;
            assert.ok(fileStub.notCalled);
        });
    });
});
