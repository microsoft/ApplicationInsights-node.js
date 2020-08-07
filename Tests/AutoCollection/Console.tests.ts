import assert = require("assert");
import sinon = require("sinon");
import Console = require("../../AutoCollection/Console")

import AppInsights = require("../../applicationinsights");

import { channel, IStandardEvent } from "diagnostic-channel";
import { enable, dispose as disable } from "../../AutoCollection/diagnostic-channel/console.sub";
import { console } from "diagnostic-channel-publishers";

describe("AutoCollection/Console", () => {
    afterEach(() => {
        AppInsights.dispose();
    });
    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop console autocollection", () => {

            var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").setAutoCollectConsole(true);
            var enableConsoleRequestsSpy = sinon.spy(Console.INSTANCE, "enable");
            appInsights.start();

            assert.equal(enableConsoleRequestsSpy.callCount, 1, "enable should be called once as part of console autocollection initialization");
            assert.equal(enableConsoleRequestsSpy.getCall(0).args[0], true);
            AppInsights.dispose();
            assert.equal(enableConsoleRequestsSpy.callCount, 2, "enable(false) should be called once as part of console autocollection shutdown");
            assert.equal(enableConsoleRequestsSpy.getCall(1).args[0], false);
        });
    });

    describe("#log and #error()", () => {
        it("should call trackException for errors and trackTrace for logs", () => {
            var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            appInsights.start();

            const trackExceptionStub = sinon.stub(AppInsights.defaultClient, "trackException");
            const trackTraceStub = sinon.stub(AppInsights.defaultClient, "trackTrace");

            disable();
            enable(true, AppInsights.defaultClient);
            const logEvent: console.IConsoleData = {
                message: "test log",
                stderr: true // should log as MessageData regardless of this setting
            };
            const dummyError = new Error("test error");
            const errorEvent: console.IConsoleData = {
                message: dummyError as any,
                stderr: false, // log() should still log as ExceptionData
            };

            channel.publish("console", logEvent);
            assert.ok(trackExceptionStub.notCalled);
            assert.ok(trackTraceStub.calledOnce);
            assert.deepEqual(trackTraceStub.args[0][0].message, "test log");
            trackExceptionStub.reset();
            trackTraceStub.reset();

            channel.publish("console", errorEvent);
            assert.ok(trackExceptionStub.calledOnce);
            assert.ok(trackTraceStub.notCalled);
            assert.deepEqual(trackExceptionStub.args[0][0].exception, dummyError);

            disable();
            trackExceptionStub.restore();
            trackTraceStub.restore();
        });
    });
});
