import * as assert from "assert";
import * as sinon from "sinon";

import { AutoCollectExceptions } from "../../../src/logs/exceptions";

describe("AutoCollection/Exceptions", () => {
    let sandbox: sinon.SinonSandbox;

    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should use uncaughtExceptionMonitor for node 13.7.0+", () => {
        const nodeVer = process.versions.node.split(".");
        const expectation =
            parseInt(nodeVer[0]) > 13 || (parseInt(nodeVer[0]) === 13 && parseInt(nodeVer[1]) >= 7);
        const exceptions = new AutoCollectExceptions(null);
        assert.equal(exceptions["_canUseUncaughtExceptionMonitor"], expectation);
    });

    it("enable auto collection", () => {
        const processOnSpy = sandbox.spy(global.process, "on");
        const exceptions = new AutoCollectExceptions(null);
        exceptions.enable(true);
        if (exceptions["_canUseUncaughtExceptionMonitor"]) {
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
    });

    it("disables auto collection", () => {
        const processRemoveListenerSpy = sandbox.spy(global.process, "removeListener");
        const exceptions = new AutoCollectExceptions(null);
        exceptions.enable(true);
        exceptions.enable(false);
        if (exceptions["_canUseUncaughtExceptionMonitor"]) {
            assert.equal(
                processRemoveListenerSpy.callCount,
                1,
                "After enabling exception auto collection, there should be 1 call to processOnSpy"
            );
            assert.equal(processRemoveListenerSpy.getCall(0).args[0], "uncaughtExceptionMonitor");
        } else {
            assert.equal(
                processRemoveListenerSpy.callCount,
                2,
                "After enabling exception auto collection, there should be 2 calls to processOnSpy"
            );
            assert.equal(processRemoveListenerSpy.getCall(0).args[0], "uncaughtException");
            assert.equal(processRemoveListenerSpy.getCall(1).args[0], "unhandledRejection");
        }
    });
});
