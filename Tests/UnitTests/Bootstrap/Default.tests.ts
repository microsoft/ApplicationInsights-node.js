import * as assert from "assert";
import { createSandbox, SinonSpy } from "sinon";
import { DiagnosticLogger } from "../../../src/bootstrap/diagnosticLogger";
import * as DataModel from "../../../src/bootstrap/dataModel";
import * as Helpers from "../../../src/bootstrap/helpers";
import * as DefaultTypes from "../../../src/bootstrap/default";
import * as appInsights from "../../../src/applicationinsights";

class LoggerSpy implements DataModel.AgentLogger {
  public logCount = 0;
  public errorCount = 0;

  public log() {
    this.logCount++;
  }
  public error() {
    this.errorCount++;
  }
}

describe("#setupAndStart()", () => {
  let startSpy: SinonSpy = null;
  let sandbox: sinon.SinonSandbox;

  before(() => {
    sandbox = createSandbox();
  });

  beforeEach(() => {
    startSpy = sandbox.spy(appInsights, "start");
  });

  afterEach(() => {
    sandbox.restore();
    delete require.cache[require.resolve("../../../Bootstrap/Default")];
  });

  it("should return the client if started multiple times", () => {
    const logger = new LoggerSpy();
    const origEnv = process.env.ApplicationInsightsAgent_EXTENSION_VERSION;
    process.env.ApplicationInsightsAgent_EXTENSION_VERSION = "~2";
    sandbox.stub(Helpers, "sdkAlreadyExists").callsFake(() => false);

    // Test
    const Default = require("../../../Bootstrap/Default") as typeof DefaultTypes;
    Default.setLogger(new DiagnosticLogger(logger));
    const instance1 = Default.setupAndStart("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
    assert.ok(instance1.defaultClient);
    const instance2 = Default.setupAndStart("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
    assert.deepEqual(instance1.defaultClient, instance2.defaultClient);

    // Cleanup
    instance1.dispose();
    instance2.dispose();
    process.env.ApplicationInsightsAgent_EXTENSION_VERSION = origEnv;
  });

  it("should setup and start the SDK", () => {
    // Setup env vars before requiring loader
    const logger = new LoggerSpy();
    const origEnv = process.env.ApplicationInsightsAgent_EXTENSION_VERSION;
    process.env.ApplicationInsightsAgent_EXTENSION_VERSION = "~2";
    sandbox.stub(Helpers, "sdkAlreadyExists").callsFake(() => false);

    // Test
    const Default = require("../../../Bootstrap/Default") as typeof DefaultTypes;
    Default.setLogger(new DiagnosticLogger(logger));
    const instance = Default.setupAndStart("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
    assert.deepEqual(instance, appInsights);

    // Cleanup
    instance.dispose();
    process.env.ApplicationInsightsAgent_EXTENSION_VERSION = origEnv;

    // start was called once
    assert.equal(startSpy.callCount, 1);

    // No Logger was done
    assert.equal(logger.logCount, 1);
    assert.equal(logger.errorCount, 0);
  });

  it("should not setup and start the SDK if no setupString is provided", () => {
    // Setup
    const logger = new LoggerSpy();
    const origEnv = process.env.ApplicationInsightsAgent_EXTENSION_VERSION;
    const origIkey = process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
    const origCs = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    process.env.ApplicationInsightsAgent_EXTENSION_VERSION = "~2";
    delete process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
    delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    sandbox.stub(Helpers, "sdkAlreadyExists").callsFake(() => false);

    // Test
    const Default = require("../../../Bootstrap/Default") as typeof DefaultTypes;
    Default.setLogger(new DiagnosticLogger(logger));
    const instance = Default.setupAndStart();
    assert.equal(instance, null);

    // Cleanup
    process.env.ApplicationInsightsAgent_EXTENSION_VERSION = origEnv;

    // start was never called
    assert.equal(startSpy.callCount, 0);

    // No Logger was done
    assert.equal(logger.logCount, 0);
    assert.equal(logger.errorCount, 1, "Should log if attach is attempted");

    process.env.APPINSIGHTS_INSTRUMENTATIONKEY = origIkey;
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = origCs;
  });
});
