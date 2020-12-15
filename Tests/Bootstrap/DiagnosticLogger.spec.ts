import assert = require("assert");
import sinon = require("sinon");
import { AgentLogger } from "../../Bootstrap/DataModel";
import { DiagnosticLogger } from "../../Bootstrap/DiagnosticLogger";
import { NoopLogger } from "../../Bootstrap/NoopLogger";
import * as DataModel from "../../Bootstrap/DataModel";

class TestWriter implements AgentLogger {
    prev: any;

    log(message?: any, ...optional: any[]): void {
        this.prev = message;
    }

    error(message?: any, ...optional: any[]): void {
        this.log(message, ...optional);
    }
}

describe("DiagnosticLogger", () => {
    const logger = new DiagnosticLogger(new NoopLogger());
    const stub = sinon.stub(logger["_writer"], "log");
    const version = require("../../../package.json").version;

    afterEach(() => {
        stub.reset();
    })

    describe("#DiagnosticLogger.DefaultEnvelope", () => {
        it("should have the correct version string", () => {
            assert.equal(DiagnosticLogger.DefaultEnvelope.properties.sdkVersion, version);
        });
    });

    describe("#DiagnosticLogger.logMessage", () => {
        it("should log all required fields", () => {
            const expectedDate = new Date().toISOString();
            logger.logMessage("Some message");
            assert.deepEqual(stub.args[0][0], {
                level: DataModel.SeverityLevel.INFO,
                message: "Some message",
                logger: "applicationinsights.extension.diagnostics",
                time: expectedDate,
                properties: {
                    language: "nodejs",
                    operation: "Startup",
                    siteName: undefined,
                    ikey: undefined,
                    extensionVersion: undefined,
                    sdkVersion: version,
                    subscriptionId: null,
                }
            } as DataModel.DiagnosticLog)
        })
    });
});
