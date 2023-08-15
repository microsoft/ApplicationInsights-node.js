import * as assert from "assert";
import * as sinon from "sinon";
import { channel } from "diagnostic-channel";
import { bunyan } from "diagnostic-channel-publishers";

import { enable, dispose } from "../../../src/logs/diagnostic-channel/bunyan.sub";
import { Util } from "../../../src/shared/util";
import { ApplicationInsightsClient } from "../../../src";
import { ApplicationInsightsOptions } from "../../../src/types";

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
        const config: ApplicationInsightsOptions = {
            azureMonitorExporterConfig: {
                connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;"
            },
            logInstrumentationOptions: {
                bunyan: { enabled: true }
            }
        };
        const client = new ApplicationInsightsClient(config);
        const stub = sandbox.stub(client, "trackException");
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
        const config: ApplicationInsightsOptions = {
            azureMonitorExporterConfig: {
                connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;"
            },
            logInstrumentationOptions: {
                bunyan: { enabled: true }
            }
        };
        const client = new ApplicationInsightsClient(config);
        const stub = sandbox.stub(client, "trackTrace");
        const logEvent: bunyan.IBunyanData = {
            result: "test log",
            level: 50, // Error should still log as MessageData
        };
        channel.publish("bunyan", logEvent);
        assert.ok(stub.calledOnce);
        assert.deepEqual(stub.args[0][0].message, "test log");
    });

    it("should notify multiple handlers", () => {
        const config: ApplicationInsightsOptions = {
            azureMonitorExporterConfig: {
                connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;"
            },
            logInstrumentationOptions: {
                bunyan: { enabled: true }
            }
        };
        const client = new ApplicationInsightsClient(config);
        const secondClient = new ApplicationInsightsClient(config);
        const stub = sandbox.stub(client, "trackTrace");
        const secondStub = sandbox.stub(secondClient, "trackTrace");
        enable(true, client);
        enable(true, secondClient);
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
