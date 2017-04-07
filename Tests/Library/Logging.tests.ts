import assert = require("assert");
import sinon = require("sinon");

import Logging = require("../../Library/Logging");

describe("Library/Logging", () => {

    describe("#info(message, ...optionalParams: any)", () => {
        it("should do nothing if disabled", () => {
            var originalSetting = Logging.enableDebug;
            Logging.enableDebug = false;
            var infoStub = sinon.stub(console, "info");
            Logging.info("test");
            assert.ok(infoStub.notCalled);
            infoStub.restore();
            Logging.enableDebug = originalSetting;
        });

        it("should log 'info' if enabled", () => {
            var originalSetting = Logging.enableDebug;
            Logging.enableDebug = true;
            var infoStub = sinon.stub(console, "info");
            Logging.info("test");
            assert.ok(infoStub.calledOnce);
            infoStub.restore();
            Logging.enableDebug = originalSetting;
        });
    });

    describe("#warn(message, ...optionalParams: any)", () => {
        it("should do nothing if disabled", () => {
            var originalSetting = Logging.enableDebug;
            Logging.enableDebug = false;
            var warnStub = sinon.stub(console, "warn");
            Logging.info("test");
            assert.ok(warnStub.notCalled);
            warnStub.restore();
            Logging.enableDebug = originalSetting;
        });

        it("should log 'warn' if enabled", () => {
            var originalSetting = Logging.enableDebug;
            Logging.enableDebug = true;
            var warnStub = sinon.stub(console, "warn");
            Logging.warn("test");
            assert.ok(warnStub.calledOnce);
            warnStub.restore();
            Logging.enableDebug = originalSetting;
        });
    });
});
