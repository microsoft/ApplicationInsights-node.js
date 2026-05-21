// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import assert from "assert";
import sinon from "sinon";
import { logs } from "@opentelemetry/api-logs";
import { LoggerProvider } from "@opentelemetry/sdk-logs";

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

    it("does not forceFlush on non-terminal (unhandledRejection) exceptions", () => {
        const trackException = sandbox.stub();
        const forceFlush = sandbox.stub().resolves();
        sandbox
            .stub(logs, "getLoggerProvider")
            .returns({ forceFlush } as unknown as LoggerProvider);

        const fakeClient: any = { trackException };
        const exceptions = new AutoCollectExceptions(fakeClient);
        try {
            // Invoke the rejection handler (reThrow=false → never terminal)
            (exceptions as any)._handleException(
                false,
                "unhandledRejection",
                new Error("boom")
            );
            assert.equal(trackException.callCount, 1, "should track the exception");
            assert.equal(
                forceFlush.callCount,
                0,
                "must NOT forceFlush per exception under normal operation"
            );
        } finally {
            exceptions.shutdown();
        }
    });

    it("rate-limits exception telemetry and emits a single suppressed-count summary", () => {
        const trackException = sandbox.stub();
        sandbox
            .stub(logs, "getLoggerProvider")
            .returns({ forceFlush: sandbox.stub().resolves() } as unknown as LoggerProvider);

        const fakeClient: any = { trackException };
        const exceptions = new AutoCollectExceptions(fakeClient);
        try {
            // Fire many more than the bucket capacity (50) within the window.
            for (let i = 0; i < 500; i++) {
                (exceptions as any)._handleException(
                    false,
                    "unhandledRejection",
                    new Error(`err-${i}`)
                );
            }
            assert.equal(
                trackException.callCount,
                50,
                "should cap tracked exceptions at the bucket capacity within one window"
            );

            // Advance the window by manipulating internal timestamp, then fire
            // one more — refill should emit one summary record + the new one.
            (exceptions as any)._lastRefillTime = Date.now() - 61_000;
            (exceptions as any)._handleException(
                false,
                "unhandledRejection",
                new Error("after-window")
            );
            assert.equal(
                trackException.callCount,
                52,
                "after window refill, expect one summary record + the new tracked exception"
            );
            const summaryArg = trackException.getCall(50).args[0];
            assert.match(
                summaryArg.exception.message,
                /suppressed 450 exception telemetry record/,
                "summary record should report the number of suppressed exceptions"
            );
        } finally {
            exceptions.shutdown();
        }
    });
});
