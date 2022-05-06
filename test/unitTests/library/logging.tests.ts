import * as assert from "assert";
import * as sinon from "sinon";

import { Logger } from "../../../src/library/logging";
import { InternalAzureLogger } from "../../../src/library/Logging/InternalAzureLogger";

describe("Library/Logger", () => {
    var sandbox: sinon.SinonSandbox;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = process.env;
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        InternalAzureLogger["_instance"] = null;
        process.env = originalEnv;
        sandbox.restore();
    });

    describe("Log to console", () => {
        it("should log info message to console", () => {
            InternalAzureLogger.getInstance()["_logToConsole"] = true;
            Logger.getInstance().enableInfo = true;
            var consoleStub = sandbox.stub(console, "info");
            Logger.getInstance().info("test");
            assert.ok(consoleStub.called);
        });

        // it("should not log message to console if disabled", () => {
        //     const env = <{ [id: string]: string }>{};
        //     env["APPLICATIONINSIGHTS_LOG_DESTINATION"] = "file";
        //     process.env = env;
        //     Logger.getInstance().enableInfo = true;
        //     var consoleStub = sandbox.stub(console, "info");
        //     InternalAzureLogger["_instance"] = null;
        //     Logger.getInstance().info("test");
        //     assert.ok(consoleStub.notCalled);
        // });
    });

    // describe("#info(message, ...optionalParams: any)", () => {
    //     it("should do nothing if disabled", () => {
    //         var originalSetting = Logger.getInstance().disableWarnings;
    //         Logger.getInstance().enableDebug = false;
    //         var infoStub = sandbox.stub(InternalAzureLogger.getInstance(), "info");
    //         Logger.getInstance().info("test");
    //         assert.ok(infoStub.notCalled);
    //         Logger.getInstance().enableDebug = originalSetting;
    //     });

    //     it("should log 'info' if called", () => {
    //         var originalSetting = Logger.getInstance().enableDebug;
    //         Logger.getInstance().enableDebug = true;
    //         var infoStub = sandbox.stub(InternalAzureLogger.getInstance(), "info");
    //         Logger.getInstance().info("test");
    //         assert.ok(infoStub.calledOnce);
    //         Logger.getInstance().enableDebug = originalSetting;
    //     });
    // });

    // describe("#warn(message, ...optionalParams: any)", () => {
    //     it("should do nothing if disabled", () => {
    //         var originalSetting = Logger.getInstance().disableWarnings;
    //         Logger.getInstance().disableWarnings = true;
    //         var warnStub = sandbox.stub(InternalAzureLogger.getInstance(), "warning");
    //         Logger.getInstance().warn("test");
    //         assert.ok(warnStub.notCalled);
    //         Logger.getInstance().enableDebug = originalSetting;
    //     });

    //     it("should log 'warn' if enabled", () => {
    //         var originalSetting = Logger.getInstance().disableWarnings;
    //         Logger.getInstance().disableWarnings = false;
    //         var warnStub = sandbox.stub(InternalAzureLogger.getInstance(), "warning");
    //         Logger.getInstance().warn("test");
    //         assert.ok(warnStub.calledOnce);
    //         Logger.getInstance().enableDebug = originalSetting;
    //     });
    // });

    // describe("Log to file", () => {
    //     it("should log message to file", () => {
    //         const env = <{ [id: string]: string }>{};
    //         env["APPLICATIONINSIGHTS_LOG_DESTINATION"] = "file";
    //         process.env = env;
    //         Logger.getInstance().enableDebug = true;
    //         var fileStub = sandbox.stub(InternalAzureLogger.getInstance() as any, "_storeToDisk");
    //         Logger.getInstance().info("test");
    //         assert.ok(fileStub.called);
    //     });

    //     it("should not log message to file if disabled", () => {
    //         const env = <{ [id: string]: string }>{};
    //         env["APPLICATIONINSIGHTS_LOG_DESTINATION"] = "console";
    //         process.env = env;
    //         Logger.getInstance().enableDebug = true;
    //         var fileStub = sandbox.stub(InternalAzureLogger.getInstance() as any, "_storeToDisk");
    //         Logger.getInstance().info("test");
    //         assert.ok(fileStub.notCalled);
    //     });
    // });
});
