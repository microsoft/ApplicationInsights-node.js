// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import assert from "assert";
import sinon from "sinon";

import { AutoCollectExceptions } from "../../../src/logs/exceptions";

describe("AutoCollection/Exceptions", () => {
    let sandbox: sinon.SinonSandbox;

    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("enable auto collection", () => {
        const processOnSpy = sandbox.spy(global.process, "on");
        new AutoCollectExceptions(null);
        assert.equal(
            processOnSpy.callCount,
            2,
            "After enabling exception auto collection, there should be 2 calls to processOnSpy"
        );
        assert.equal(processOnSpy.getCall(0).args[0], "uncaughtException");
        assert.equal(processOnSpy.getCall(1).args[0], "unhandledRejection");
    });

    it("disables auto collection", () => {
        const processRemoveListenerSpy = sandbox.spy(global.process, "removeListener");
        const exceptions = new AutoCollectExceptions(null);
        exceptions.shutdown();
        assert.equal(
            processRemoveListenerSpy.callCount,
            2,
            "After enabling exception auto collection, there should be 2 calls to processOnSpy"
        );
        assert.equal(processRemoveListenerSpy.getCall(0).args[0], "uncaughtException");
        assert.equal(processRemoveListenerSpy.getCall(1).args[0], "unhandledRejection");
    });
});
