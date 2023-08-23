import * as assert from "assert";
import * as sinon from "sinon";
import { channel } from "diagnostic-channel";
import { winston } from "diagnostic-channel-publishers";
import { logs } from "@opentelemetry/api-logs";
import { enable, dispose } from "../../../src/logs/diagnostic-channel/winston.sub";
import { LogApi } from "../../../src/logs/api";
import { AutoCollectConsole } from "../../../src/logs/console";

describe("diagnostic-channel/winston", () => {
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
            winston: { enabled: true }
        });
        const stub = sandbox.stub(logApi, "trackException");
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
        let logApi = new LogApi(logs.getLogger("testLogger"));
        let autoCollect = new AutoCollectConsole(logApi);
        autoCollect.enable({
            winston: { enabled: true }
        });
        const stub = sandbox.stub(logApi, "trackTrace");
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
        let logApi = new LogApi(logs.getLogger("testLogger"));
        let secondLogApi = new LogApi(logs.getLogger("testLogger"));
        const stub = sandbox.stub(logApi, "trackTrace");
        const secondStub = sandbox.stub(secondLogApi, "trackTrace");
        enable(true, logApi);
        enable(true, secondLogApi);
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
