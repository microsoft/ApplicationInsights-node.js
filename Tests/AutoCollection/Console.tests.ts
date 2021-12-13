import assert = require("assert");
import sinon = require("sinon");
import { channel } from "diagnostic-channel";
import { console } from "diagnostic-channel-publishers";

import AppInsights = require("../../applicationinsights");
import { enable, dispose as disable } from "../../AutoCollection/diagnostic-channel/console.sub";


describe("AutoCollection/Console", () => {
    afterEach(() => {
        AppInsights.dispose();
    });
    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop console auto collection", () => {

            var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").setAutoCollectConsole(true);
            var enableConsoleRequestsSpy = sinon.spy(AppInsights.defaultClient.autoCollector["_console"], "enable");
            appInsights.start();

            assert.equal(enableConsoleRequestsSpy.callCount, 1, "enable should be called once as part of console auto collection initialization");
            assert.equal(enableConsoleRequestsSpy.getCall(0).args[0], true);
            AppInsights.dispose();
            assert.equal(enableConsoleRequestsSpy.callCount, 2, "enable(false) should be called once as part of console auto collection shutdown");
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
