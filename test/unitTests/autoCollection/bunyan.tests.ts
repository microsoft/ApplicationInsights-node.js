import * as assert from "assert";
import * as sinon from "sinon";
import { channel } from "diagnostic-channel";
import { bunyan } from "diagnostic-channel-publishers";

import { enable, dispose } from "../../../src/autoCollection/diagnostic-channel/bunyan.sub";
import { Util } from "../../../src/library/util";
import { LogHandler, ResourceManager } from "../../../src/library/handlers";
import { Config } from "../../../src/library/configuration";

describe("diagnostic-channel/bunyan", () => {
    var sandbox: sinon.SinonSandbox;

    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
        dispose();
    });

    it("should call trackException for errors", () => {
        let config = new Config("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
        config.enableAutoCollectConsole = true;
        let handler = new LogHandler(config, new ResourceManager(config));
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
        let config = new Config("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
        config.enableAutoCollectConsole = true;
        let handler = new LogHandler(config, new ResourceManager(config));
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
        let config = new Config("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
        let handler = new LogHandler(config, new ResourceManager(config));
        let secondHandler = new LogHandler(config, new ResourceManager(config));
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
