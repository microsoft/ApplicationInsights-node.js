import * as assert from "assert";
import * as sinon from "sinon";
import { channel } from "diagnostic-channel";
import { bunyan } from "diagnostic-channel-publishers";
import { logs } from "@opentelemetry/api-logs";
import { enable, dispose } from "../../../src/logs/diagnostic-channel/bunyan.sub";
import { Util } from "../../../src/shared/util";
import { AutoCollectConsole } from "../../../src/logs/console";
import { LogApi } from "../../../src/logs/api";


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
        let logApi = new LogApi(logs.getLogger("testLogger"));
        let autoCollect = new AutoCollectConsole(logApi);
        autoCollect.enable({
            bunyan: { enabled: true }
        });
        const stub = sandbox.stub(logApi, "trackException");
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
        let logApi = new LogApi(logs.getLogger("testLogger"));
        let autoCollect = new AutoCollectConsole(logApi);
        autoCollect.enable({
            bunyan: { enabled: true }
        });
        const stub = sandbox.stub(logApi, "trackTrace");
        const logEvent: bunyan.IBunyanData = {
            result: "test log",
            level: 50, // Error should still log as MessageData
        };
        channel.publish("bunyan", logEvent);
        assert.ok(stub.calledOnce);
        assert.deepEqual(stub.args[0][0].message, "test log");
    });

    it("should notify multiple handlers", () => {
        let logApi = new LogApi(logs.getLogger("testLogger"));
        let secondLogApi = new LogApi(logs.getLogger("testLogger"));

        const stub = sandbox.stub(logApi, "trackTrace");
        const secondStub = sandbox.stub(secondLogApi, "trackTrace");
        enable(true, logApi);
        enable(true, secondLogApi);
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
