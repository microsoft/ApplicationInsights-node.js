import * as assert from "assert";
import * as sinon from "sinon";
import { channel } from "diagnostic-channel";
import { winston } from "diagnostic-channel-publishers";

import { enable, dispose } from "../../../src/autoCollection/diagnostic-channel/winston.sub";
import { LogHandler } from "../../../src/library/handlers";
import { Config } from "../../../src/library/configuration";

describe("diagnostic-channel/winston", () => {
    var sandbox: sinon.SinonSandbox;

    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
        dispose();
    });

    it("should call trackException for errors", () => {
        let config = new Config();
        config.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
        config.logInstrumentations.winston.enabled = true;
        let handler = new LogHandler(config);
        handler.start();
        const stub = sandbox.stub(handler, "trackException");
        const dummyError = new Error("test error");
        const errorEvent: winston.IWinstonData = {
            message: dummyError as any,
            meta: {},
            level: "foo",
            levelKind: "npm",
        };
        channel.publish("winston", errorEvent);
        assert.ok(stub.calledOnce);
        assert.deepEqual(stub.args[0][0].exception, dummyError);
    });

    it("should call trackTrace for logs", () => {
        let config = new Config();
        config.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
        config.logInstrumentations.winston.enabled = true;
        let handler = new LogHandler(config);
        handler.start();
        const stub = sandbox.stub(handler, "trackTrace");
        const logEvent: winston.IWinstonData = {
            message: "test log",
            meta: {},
            level: "foo",
            levelKind: "npm",
        };
        channel.publish("winston", logEvent);
        assert.ok(stub.calledOnce);
        assert.deepEqual(stub.args[0][0].message, "test log");
    });

    it("should notify multiple handlers", () => {
        let config = new Config();
        config.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
        config.logInstrumentations.winston.enabled = true;
        let handler = new LogHandler(config);
        let secondHandler = new LogHandler(config);
        const stub = sandbox.stub(handler, "trackTrace");
        const secondStub = sandbox.stub(secondHandler, "trackTrace");
        enable(true, handler);
        enable(true, secondHandler);
        const logEvent: winston.IWinstonData = {
            message: "test log",
            meta: {},
            level: "foo",
            levelKind: "npm",
        };
        channel.publish("winston", logEvent);
        assert.ok(stub.calledOnce);
        assert.deepEqual(stub.args[0][0].message, "test log");
        assert.ok(secondStub.calledOnce);
        assert.deepEqual(secondStub.args[0][0].message, "test log");
    });
});
