import assert = require("assert");
import sinon = require("sinon");

import AutoCollectionExceptions = require("../../AutoCollection/Exceptions");
import Client = require("../../Library/TelemetryClient");
import AppInsights = require("../../applicationinsights");

describe("AutoCollection/Exceptions", () => {
    describe("#init and dispose()", () => {
        afterEach(() => {
            AppInsights.dispose();
        });

        it("disables autocollection", () => {
            var processOnSpy = sinon.spy(global.process, "on");
            var processRemoveListenerSpy = sinon.spy(global.process, "removeListener");

            AppInsights.setup("key").setAutoCollectExceptions(true).start();
            assert.equal(processOnSpy.callCount, 2, "After enabling exception autocollection, there should be 2 calls to processOnSpy");
            assert.equal(processOnSpy.getCall(0).args[0], AutoCollectionExceptions.UNCAUGHT_EXCEPTION_HANDLER_NAME);
            assert.equal(processOnSpy.getCall(1).args[0], AutoCollectionExceptions.UNHANDLED_REJECTION_HANDLER_NAME);
            processOnSpy.restore();
            processRemoveListenerSpy.restore();
        });
    });
});
