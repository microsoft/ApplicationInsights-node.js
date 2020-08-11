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

        it("should use uncaughtExceptionMonitor for node 13.7.0+", () => {
            var nodeVer = process.versions.node.split(".");
            var expectation = parseInt(nodeVer[0]) > 13 || (parseInt(nodeVer[0]) === 13 && parseInt(nodeVer[1]) >= 7);
            var exceptions = new AutoCollectionExceptions(null);
            assert.equal(AutoCollectionExceptions["_canUseUncaughtExceptionMonitor"], expectation);
        });

        it("disables autocollection", () => {
            var processOnSpy = sinon.spy(global.process, "on");
            var processRemoveListenerSpy = sinon.spy(global.process, "removeListener");

            AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").setAutoCollectExceptions(true).start();

            if (AutoCollectionExceptions["_canUseUncaughtExceptionMonitor"]) {
                assert.equal(processOnSpy.callCount, 1, "After enabling exception autocollection, there should be 1 call to processOnSpy");
                assert.equal(processOnSpy.getCall(0).args[0], AutoCollectionExceptions.UNCAUGHT_EXCEPTION_MONITOR_HANDLER_NAME);
            } else {
                assert.equal(processOnSpy.callCount, 2, "After enabling exception autocollection, there should be 2 calls to processOnSpy");
                assert.equal(processOnSpy.getCall(0).args[0], AutoCollectionExceptions.UNCAUGHT_EXCEPTION_HANDLER_NAME);
                assert.equal(processOnSpy.getCall(1).args[0], AutoCollectionExceptions.UNHANDLED_REJECTION_HANDLER_NAME);
            }
            processOnSpy.restore();
            processRemoveListenerSpy.restore();
        });
    });
});
