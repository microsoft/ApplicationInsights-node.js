import * as assert from "assert";
import * as sinon from "sinon";
import { channel } from "diagnostic-channel";
import { winston } from "diagnostic-channel-publishers";

import { enable, dispose, } from "../../../src/autoCollection/diagnostic-channel/winston.sub";
import { Context, } from "../../../src/library";
import { LogHandler } from "../../../src/library/handlers";
import { Config } from "../../../src/Library/configuration";


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
        let config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        config.enableAutoCollectConsole = true;
        let handler = new LogHandler(config, new Context());
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
        let config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        config.enableAutoCollectConsole = true;
        let handler = new LogHandler(config, new Context());
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
        let handler = new LogHandler(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"), new Context());
        let secondHandler = new LogHandler(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"), new Context());
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
