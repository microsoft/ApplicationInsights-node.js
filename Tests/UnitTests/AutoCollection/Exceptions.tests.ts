import * as assert from "assert";
import * as sinon from "sinon";

import { AutoCollectExceptions } from "../../../src/autoCollection/exceptions";
import * as AppInsights from "../../../src/applicationinsights";

describe("AutoCollection/Exceptions", () => {
    describe("#init and dispose()", () => {
        afterEach(() => {
            AppInsights.dispose();
        });

        it("should use uncaughtExceptionMonitor for node 13.7.0+", () => {
            var nodeVer = process.versions.node.split(".");
            var expectation =
                parseInt(nodeVer[0]) > 13 ||
                (parseInt(nodeVer[0]) === 13 && parseInt(nodeVer[1]) >= 7);
            var exceptions = new AutoCollectExceptions(null);
            assert.equal(exceptions["_canUseUncaughtExceptionMonitor"], expectation);
        });

        it("disables auto collection", () => {
            var processOnSpy = sinon.spy(global.process, "on");
            var processRemoveListenerSpy = sinon.spy(global.process, "removeListener");

            AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333")
                .setAutoCollectExceptions(true)
                .start();

            if (
                AppInsights.defaultClient.logHandler["_exceptions"][
                    "_canUseUncaughtExceptionMonitor"
                ]
            ) {
                assert.equal(
                    processOnSpy.callCount,
                    1,
                    "After enabling exception auto collection, there should be 1 call to processOnSpy"
                );
                assert.equal(processOnSpy.getCall(0).args[0], "uncaughtExceptionMonitor");
            } else {
                assert.equal(
                    processOnSpy.callCount,
                    2,
                    "After enabling exception auto collection, there should be 2 calls to processOnSpy"
                );
                assert.equal(processOnSpy.getCall(0).args[0], "uncaughtException");
                assert.equal(processOnSpy.getCall(1).args[0], "unhandledRejection");
            }
            processOnSpy.restore();
            processRemoveListenerSpy.restore();
        });
    });
});
