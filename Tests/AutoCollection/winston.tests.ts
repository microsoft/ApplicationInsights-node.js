import assert = require("assert");
import sinon = require("sinon");
import AppInsights = require("../../applicationinsights");
import { channel, IStandardEvent } from "diagnostic-channel";
import { enable, dispose as disable } from "../../AutoCollection/diagnostic-channel/winston.sub";
import { winston } from "diagnostic-channel-publishers";

describe("diagnostic-channel/winston", () => {
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
        const logEvent: winston.IWinstonData = {
            message: "test log",
            meta: {},
            level: "foo",
            levelKind: "npm"
        };
        const dummyError = new Error("test error");
        const errorEvent: winston.IWinstonData = {
            message: dummyError as any,
            meta: {},
            level: "foo",
            levelKind: "npm"
        };

        channel.publish("winston", logEvent);
        assert.ok(trackExceptionStub.notCalled);
        assert.ok(trackTraceStub.calledOnce);
        assert.deepEqual(trackTraceStub.args[0][0].message, "test log");
        trackExceptionStub.reset();
        trackTraceStub.reset();

        channel.publish("winston", errorEvent);
        assert.ok(trackExceptionStub.calledOnce);
        assert.ok(trackTraceStub.notCalled);
        assert.deepEqual(trackExceptionStub.args[0][0].exception, dummyError);

        trackExceptionStub.restore();
        trackTraceStub.restore();
    });
});
