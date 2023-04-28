import assert = require("assert");
import sinon = require("sinon");
import AppInsights = require("../../applicationinsights");
import { channel } from "diagnostic-channel";
import { enable, dispose as disable } from "../../AutoCollection/diagnostic-channel/bunyan.sub";
import { bunyan } from "diagnostic-channel-publishers";
import Util = require("../../Library/Util");

describe("diagnostic-channel/bunyan", () => {
    var sandbox: sinon.SinonSandbox;

    before(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        AppInsights.dispose();
        sandbox.restore();
        disable();
    });
    it("should call trackException for errors", () => {
        AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        AppInsights.start();

        const trackExceptionSpy = sandbox.spy(AppInsights.defaultClient, "trackException");
        const trackStub = sandbox.stub(AppInsights.defaultClient, "track");

        disable();
        enable(true, AppInsights.defaultClient);
        const logEvent: bunyan.IBunyanData = {
            result: "test log",
            level: 50 // Error should still log as MessageData
        };

        const dummyError = { message: "Test Message", name: "Test Name", stack: "Test Stack" };
        const bunyanJson = Util.stringify({ err: dummyError });
        const errorEvent: bunyan.IBunyanData = {
            result: bunyanJson,
            level: 10, // Verbose should still log as ExceptionData
        };
        channel.publish("bunyan", errorEvent);
        assert.ok(trackExceptionSpy.calledOnce);
        assert.deepEqual(trackExceptionSpy.args[0][0].exception.message, dummyError.message);
        assert.deepEqual(trackExceptionSpy.args[0][0].exception.name, dummyError.name);
        assert.deepEqual(trackExceptionSpy.args[0][0].exception.stack, dummyError.stack);

        assert.ok(trackStub.calledOnce);
        // No new error is created as valid one was provided
        assert.deepEqual(trackStub.args[0][0].exception.message, dummyError.message);
        assert.deepEqual(trackStub.args[0][0].exception.name, dummyError.name);
        assert.deepEqual(trackStub.args[0][0].exception.stack, dummyError.stack);
    });

    it("should call trackTrace for logs", () => {
        AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        AppInsights.start();
        const trackTraceStub = sandbox.stub(AppInsights.defaultClient, "trackTrace");
        disable();
        enable(true, AppInsights.defaultClient);
        const logEvent: bunyan.IBunyanData = {
            result: "test log",
            level: 50 // Error should still log as MessageData
        };
        channel.publish("bunyan", logEvent);
        assert.ok(trackTraceStub.calledOnce);
        assert.deepEqual(trackTraceStub.args[0][0].message, "test log");
    });

    it("should call trackTrace when enableBunyanErrAsTrace is enabled", () => {
        AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333")
        AppInsights.start();
            
        const trackTraceStub = sandbox.stub(AppInsights.defaultClient, "trackTrace");
        const trackExceptionSpy = sandbox.spy(AppInsights.defaultClient, "trackException");
        disable();
        AppInsights.defaultClient.config.enableLoggerErrorToTrace = true;
        enable(true, AppInsights.defaultClient);

        const dummyError = { message: "Test Message", name: "Test Name", stack: "Test Stack" };
        const bunyanJson = Util.stringify({ err: dummyError });
        const errorEvent: bunyan.IBunyanData = {
            result: bunyanJson,
            level: 50
        };
        channel.publish("bunyan", errorEvent);
        assert.ok(trackTraceStub.calledOnce);
        assert.ok(trackExceptionSpy.notCalled);
    });

    it("should call trackException when enableBunyanErrAsTrace is disabled", () => {
        AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333")
        AppInsights.start();
            
        const trackTraceStub = sandbox.stub(AppInsights.defaultClient, "trackTrace");
        const trackExceptionSpy = sandbox.spy(AppInsights.defaultClient, "trackException");
        disable();
        enable(true, AppInsights.defaultClient);

        const dummyError = { message: "Test Message", name: "Test Name", stack: "Test Stack" };
        const bunyanJson = Util.stringify({ err: dummyError });
        const errorEvent: bunyan.IBunyanData = {
            result: bunyanJson,
            level: 50
        };
        channel.publish("bunyan", errorEvent);
        assert.ok(trackExceptionSpy.calledOnce);
        assert.ok(trackTraceStub.notCalled);
        assert.deepEqual(trackExceptionSpy.args[0][0].exception.message, dummyError.message);
        assert.deepEqual(trackExceptionSpy.args[0][0].exception.name, dummyError.name);
        assert.deepEqual(trackExceptionSpy.args[0][0].exception.stack, dummyError.stack);
    });
});
