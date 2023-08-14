import * as assert from "assert";
import * as sinon from "sinon";
import { channel } from "diagnostic-channel";
import { winston } from "diagnostic-channel-publishers";

import { enable, dispose } from "../../../../src/shim/autoCollection/diagnostic-channel/winston.sub";
import { TelemetryClient } from "../../../../src";
import { ApplicationInsightsOptions } from "../../../../src/types";

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
        const config: ApplicationInsightsOptions = {
            azureMonitorExporterConfig: {
                connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;"
            },
            logInstrumentations: {
                winston: { enabled: true }
            }
        };
        const client = new TelemetryClient(config);
        client.start();
        const stub = sandbox.stub(client, "trackException");
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
        const config: ApplicationInsightsOptions = {
            azureMonitorExporterConfig: {
                connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;"
            },
            logInstrumentations: {
                winston: { enabled: true }
            }
        };
        const client = new TelemetryClient(config);
        client.start();
        const stub = sandbox.stub(client, "trackTrace");
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
        const config: ApplicationInsightsOptions = {
            azureMonitorExporterConfig: {
                connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;"
            },
            logInstrumentations: {
                winston: { enabled: true }
            }
        };
        const client = new TelemetryClient(config);
        client.start();
        const secondClient = new TelemetryClient(config);
        secondClient.start();
        const stub = sandbox.stub(client, "trackTrace");
        const secondStub = sandbox.stub(secondClient, "trackTrace");
        enable(true, client);
        enable(true, secondClient);
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
