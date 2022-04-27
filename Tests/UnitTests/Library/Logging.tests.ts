import * as assert from "assert";
import * as sinon from "sinon";

import { Logger } from "../../../src/library/logging";
import { InternalAzureLogger } from "../../../src/library/Logging/InternalAzureLogger";

describe("Library/Logger", () => {
  var sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    InternalAzureLogger["_instance"] = null;
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("Log to console", () => {
    it("should log message to console", () => {
      var env1 = <{ [id: string]: string }>{};
      env1["APPLICATIONINSIGHTS_LOG_DESTINATION"] = "console";
      var originalEnv = process.env;
      process.env = env1;
      Logger.enableDebug = true;
      var consoleStub = sandbox.stub(console, "info");
      Logger.info("test");
      process.env = originalEnv;
      assert.ok(consoleStub.called);
    });

    it("should not log message to console if disabled", () => {
      var env1 = <{ [id: string]: string }>{};
      env1["APPLICATIONINSIGHTS_LOG_DESTINATION"] = "file";
      var originalEnv = process.env;
      process.env = env1;
      Logger.enableDebug = true;
      var consoleStub = sandbox.stub(console, "info");
      Logger.info("test");
      process.env = originalEnv;
      assert.ok(consoleStub.notCalled);
    });
  });

  describe("#info(message, ...optionalParams: any)", () => {
    it("should do nothing if disabled", () => {
      var originalSetting = Logger.disableWarnings;
      Logger.enableDebug = false;
      var infoStub = sandbox.stub(InternalAzureLogger.getInstance(), "info");
      Logger.info("test");
      assert.ok(infoStub.notCalled);
      Logger.enableDebug = originalSetting;
    });

    it("should log 'info' if called", () => {
      var originalSetting = Logger.enableDebug;
      Logger.enableDebug = true;
      var infoStub = sandbox.stub(InternalAzureLogger.getInstance(), "info");
      Logger.info("test");
      assert.ok(infoStub.calledOnce);
      Logger.enableDebug = originalSetting;
    });
  });

  describe("#warn(message, ...optionalParams: any)", () => {
    it("should do nothing if disabled", () => {
      var originalSetting = Logger.disableWarnings;
      Logger.disableWarnings = true;
      var warnStub = sandbox.stub(InternalAzureLogger.getInstance(), "warning");
      Logger.warn("test");
      assert.ok(warnStub.notCalled);
      Logger.enableDebug = originalSetting;
    });

    it("should log 'warn' if enabled", () => {
      var originalSetting = Logger.disableWarnings;
      Logger.disableWarnings = false;
      var warnStub = sandbox.stub(InternalAzureLogger.getInstance(), "warning");
      Logger.warn("test");
      assert.ok(warnStub.calledOnce);
      Logger.enableDebug = originalSetting;
    });
  });

  describe("Log to file", () => {
    it("should log message to file", () => {
      var env1 = <{ [id: string]: string }>{};
      env1["APPLICATIONINSIGHTS_LOG_DESTINATION"] = "file";
      var originalEnv = process.env;
      process.env = env1;
      Logger.enableDebug = true;
      var fileStub = sandbox.stub(InternalAzureLogger.getInstance() as any, "_storeToDisk");
      Logger.info("test");
      process.env = originalEnv;
      assert.ok(fileStub.called);
    });

    it("should not log message to file if disabled", () => {
      var env1 = <{ [id: string]: string }>{};
      env1["APPLICATIONINSIGHTS_LOG_DESTINATION"] = "console";
      var originalEnv = process.env;
      process.env = env1;
      Logger.enableDebug = true;
      var fileStub = sandbox.stub(InternalAzureLogger.getInstance() as any, "_storeToDisk");
      Logger.info("test");
      process.env = originalEnv;
      assert.ok(fileStub.notCalled);
    });
  });
});
