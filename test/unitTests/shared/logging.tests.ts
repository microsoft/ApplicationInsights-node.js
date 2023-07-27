import { diag, DiagLogLevel } from "@opentelemetry/api";
import * as assert from "assert";
import * as sinon from "sinon";

import { Logger } from "../../../src/shim/logging";

describe("Library/Logger", () => {
    let sandbox: sinon.SinonSandbox;
    let stub: sinon.SinonStub;

    before(() => {
        sandbox = sinon.createSandbox();
        stub = sandbox.stub(Logger.getInstance()["_internalLogger"], "logMessage");
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("constructor", () => {
        it("should enable OpenTelemetry logging", () => {
            Logger.getInstance().updateLogLevel(DiagLogLevel.INFO);
            diag.info("Test"); // OpenTelemetry global logger
            assert.ok(stub.called);
        });
    });

    describe("logMessage", () => {
        it("should log info message", () => {
            Logger.getInstance().updateLogLevel(DiagLogLevel.INFO);
            Logger.getInstance().info("test");
            assert.ok(stub.called);
        });

        it("should log debug message", () => {
            Logger.getInstance().updateLogLevel(DiagLogLevel.DEBUG);
            Logger.getInstance().debug("test");
            assert.ok(stub.called);
        });

        it("should log error message", () => {
            Logger.getInstance().updateLogLevel(DiagLogLevel.ERROR);
            Logger.getInstance().error("test");
            assert.ok(stub.called);
        });

        it("should log verbose message", () => {
            Logger.getInstance().updateLogLevel(DiagLogLevel.VERBOSE);
            Logger.getInstance().verbose("test");
            assert.ok(stub.called);
        });

        it("should log warn message", () => {
            Logger.getInstance().updateLogLevel(DiagLogLevel.WARN);
            Logger.getInstance().warn("test");
            assert.ok(stub.called);
        });
    });
});
