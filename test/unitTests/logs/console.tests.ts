import * as assert from "assert";
import * as sinon from "sinon";
import { channel } from "diagnostic-channel";
import { console } from "diagnostic-channel-publishers";

import { enable, dispose } from "../../../src/logs/diagnostic-channel/console.sub";
import { ApplicationInsightsClient } from "../../../src";
import { ApplicationInsightsOptions } from "../../../src/types";

describe("AutoCollection/Console", () => {
    let sandbox: sinon.SinonSandbox;

    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
        dispose();
    });

    describe("#log and #error()", () => {
        it("should call trackException for errors", () => {
            const config: ApplicationInsightsOptions = {
                azureMonitorExporterConfig: {
                    connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;"
                },
                logInstrumentationOptions: {
                    console: { enabled: true }
                }
            };
            const client = new ApplicationInsightsClient(config);
            const stub = sandbox.stub(client, "trackException");
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
            const config: ApplicationInsightsOptions = {
                azureMonitorExporterConfig: {
                    connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;"
                },
                logInstrumentationOptions: {
                    console: { enabled: true }
                }
            };
            const client = new ApplicationInsightsClient(config);
            const stub = sandbox.stub(client, "trackTrace");
            const logEvent: console.IConsoleData = {
                message: "test log",
                stderr: true, // should log as MessageData regardless of this setting
            };
            channel.publish("console", logEvent);
            assert.ok(stub.calledOnce);
            assert.deepEqual(stub.args[0][0].message, "test log");
        });

        it("should notify multiple handlers", () => {
            const config: ApplicationInsightsOptions = {
                azureMonitorExporterConfig: {
                    connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;"
                },
                logInstrumentationOptions: {
                    console: { enabled: true }
                }
            };
            const client = new ApplicationInsightsClient(config);
            const secondClient = new ApplicationInsightsClient(config);
            const stub = sandbox.stub(client, "trackTrace");
            const secondStub = sandbox.stub(secondClient, "trackTrace");
            enable(true, client);
            enable(true, secondClient);
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
