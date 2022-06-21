import * as assert from "assert";
import * as sinon from "sinon";
import { channel } from "diagnostic-channel";
import { console } from "diagnostic-channel-publishers";

import { enable, dispose } from "../../../src/autoCollection/diagnostic-channel/console.sub";
import { LogHandler, ResourceManager } from "../../../src/library/handlers";
import { Config } from "../../../src/library/configuration";

describe("AutoCollection/Console", () => {
    var sandbox: sinon.SinonSandbox;

    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
        dispose();
    });

    describe("#log and #error()", () => {
        it("should call trackException for errors", () => {
            let config = new Config("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            config.enableAutoCollectConsole = true;
            let handler = new LogHandler(config);
            handler.start();
            const stub = sandbox.stub(handler, "trackException");
            const dummyError = new Error("test error");
            const errorEvent: console.IConsoleData = {
                message: dummyError as any,
                stderr: false, // log() should still log as ExceptionData
            };

            channel.publish("console", errorEvent);
            assert.ok(stub.calledOnce);
            assert.deepEqual(stub.args[0][0].exception, dummyError);
        });

        it("should call trackTrace for logs", () => {
            let config = new Config("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            config.enableAutoCollectConsole = true;
            let handler = new LogHandler(config);
            handler.start();
            const stub = sandbox.stub(handler, "trackTrace");
            const logEvent: console.IConsoleData = {
                message: "test log",
                stderr: true, // should log as MessageData regardless of this setting
            };
            channel.publish("console", logEvent);
            assert.ok(stub.calledOnce);
            assert.deepEqual(stub.args[0][0].message, "test log");
        });

        it("should notify multiple handlers", () => {
            let config = new Config("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            let handler = new LogHandler(config);
            let secondHandler = new LogHandler(config);
            const stub = sandbox.stub(handler, "trackTrace");
            const secondStub = sandbox.stub(secondHandler, "trackTrace");
            enable(true, handler);
            enable(true, secondHandler);
            const logEvent: console.IConsoleData = {
                message: "test log",
                stderr: true, // should log as MessageData regardless of this setting
            };
            channel.publish("console", logEvent);
            assert.ok(stub.calledOnce);
            assert.deepEqual(stub.args[0][0].message, "test log");
            assert.ok(secondStub.calledOnce);
            assert.deepEqual(secondStub.args[0][0].message, "test log");
        });
    });
});
