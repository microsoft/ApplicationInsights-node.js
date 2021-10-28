import assert = require("assert");
import sinon = require("sinon");

import Logging = require("../../Library/Logging");

describe("Library/Logging", () => {

    describe("#info(message, ...optionalParams: any)", () => {
        it("should do nothing if disabled", () => {
            var originalSetting = Logging.disableWarnings;
            Logging.enableDebug = false;
            var infoStub = sinon.stub(Logging.logger, "info");
            Logging.info("test");
            assert.ok(infoStub.notCalled);
            infoStub.restore();
            Logging.enableDebug = originalSetting;
        });

        it("should log 'info' if called", () => {
            var originalSetting = Logging.enableDebug;
            Logging.enableDebug = true;
            var infoStub = sinon.stub(Logging.logger, "info");
            Logging.info("test");
            assert.ok(infoStub.calledOnce);
            infoStub.restore();
            Logging.enableDebug = originalSetting;
        });
    });

    describe("#warn(message, ...optionalParams: any)", () => {
        it("should do nothing if disabled", () => {
            var originalSetting = Logging.disableWarnings;
            Logging.disableWarnings = true
            var warnStub = sinon.stub(Logging.logger, "warning");
            Logging.warn("test");
            assert.ok(warnStub.notCalled);
            warnStub.restore();
            Logging.enableDebug = originalSetting;
        });

        it("should log 'warn' if enabled", () => {
            var originalSetting = Logging.disableWarnings;
            Logging.disableWarnings = false;
            var warnStub = sinon.stub(Logging.logger, "warning");
            Logging.warn("test");
            assert.ok(warnStub.calledOnce);
            warnStub.restore();
            Logging.enableDebug = originalSetting;
        });
    });
});
