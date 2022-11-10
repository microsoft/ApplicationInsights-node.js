import * as assert from "assert";
import * as sinon from "sinon";
import { channel } from "diagnostic-channel";
import { bunyan } from "diagnostic-channel-publishers";

import { enable, dispose } from "../../../src/logs/diagnostic-channel/bunyan.sub";
import { Util } from "../../../src/shared/util";
import { LogHandler } from "../../../src/logs";
import { ApplicationInsightsConfig } from "../../../src/shared";

describe("diagnostic-channel/bunyan", () => {
    let sandbox: sinon.SinonSandbox;

    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
        dispose();
    });

    it("should call trackException for errors", () => {
        const config = new ApplicationInsightsConfig();
        config.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
        config.logInstrumentations.bunyan.enabled = true;
        const handler = new LogHandler(config);
        handler.start();
        const stub = sandbox.stub(handler, "trackException");
        const dummyError = { stack: "Test error" };
        const bunyanJson = Util.getInstance().stringify({ err: dummyError });
        const errorEvent: bunyan.IBunyanData = {
            result: bunyanJson,
            level: 10, // Verbose should still log as ExceptionData
        };
        channel.publish("bunyan", errorEvent);
        assert.ok(stub.calledOnce);
        assert.deepEqual(stub.args[0][0].exception, dummyError);
    });

    it("should call trackTrace for logs", () => {
        const config = new ApplicationInsightsConfig();
        config.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
        config.logInstrumentations.bunyan.enabled = true;
        const handler = new LogHandler(config);
        handler.start();
        const stub = sandbox.stub(handler, "trackTrace");
        const logEvent: bunyan.IBunyanData = {
            result: "test log",
            level: 50, // Error should still log as MessageData
        };
        channel.publish("bunyan", logEvent);
        assert.ok(stub.calledOnce);
        assert.deepEqual(stub.args[0][0].message, "test log");
    });

    it("should notify multiple handlers", () => {
        const config = new ApplicationInsightsConfig();
        config.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
        config.logInstrumentations.bunyan.enabled = true;
        const handler = new LogHandler(config);
        const secondHandler = new LogHandler(config);
        const stub = sandbox.stub(handler, "trackTrace");
        const secondStub = sandbox.stub(secondHandler, "trackTrace");
        enable(true, handler);
        enable(true, secondHandler);
        const logEvent: bunyan.IBunyanData = {
            result: "test log",
            level: 50, // Error should still log as MessageData
        };
        channel.publish("bunyan", logEvent);
        assert.ok(stub.calledOnce);
        assert.deepEqual(stub.args[0][0].message, "test log");
        assert.ok(secondStub.calledOnce);
        assert.deepEqual(secondStub.args[0][0].message, "test log");
    });
});
