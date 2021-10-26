import assert = require("assert");
import sinon = require("sinon");
import AppInsights = require("../../applicationinsights");
import { channel, IStandardEvent } from "diagnostic-channel";
import { enable, dispose as disable } from "../../AutoCollection/diagnostic-channel/bunyan.sub";
import { bunyan } from "diagnostic-channel-publishers";

describe("diagnostic-channel/bunyan", () => {
    afterEach(() => {
        AppInsights.dispose();
        disable();
    });
    it("should call trackException for errors, trackTrace for logs", () => {
        AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        AppInsights.start();

        const trackExceptionStub = sinon.stub(AppInsights.defaultClient, "trackException");
        const trackTraceStub = sinon.stub(AppInsights.defaultClient, "trackTrace");

        disable();
        enable(true, AppInsights.defaultClient);
        const logEvent: bunyan.IBunyanData = {
            result: "test log",
            level: 50 // Error should still log as MessageData
        };

        const dummyError = { stack: "Test error" };
        const bunyanJson = JSON.stringify({ err: dummyError });
        const errorEvent: bunyan.IBunyanData = {
            result: bunyanJson,
            level: 10, // Verbose should still log as ExceptionData
        };

        channel.publish("bunyan", logEvent);
        assert.ok(trackExceptionStub.notCalled);
        assert.ok(trackTraceStub.calledOnce);
        assert.deepEqual(trackTraceStub.args[0][0].message, "test log");
        trackExceptionStub.reset();
        trackTraceStub.reset();

        channel.publish("bunyan", errorEvent);
        assert.ok(trackExceptionStub.calledOnce);
        assert.ok(trackTraceStub.notCalled);
        assert.deepEqual(trackExceptionStub.args[0][0].exception, dummyError);

        trackExceptionStub.restore();
        trackTraceStub.restore();
    });
});
