import * as assert from "assert";
import * as sinon from "sinon";

import * as AppInsights from "../../src/applicationinsights";
import * as Contracts from "../../src/declarations/Contracts";

describe("ApplicationInsights", () => {
  var sandbox: sinon.SinonSandbox;
  before(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    AppInsights.dispose();
  });

  describe("#setup()", () => {
    it("should not warn if setup is called once", () => {
      var warnStub = sandbox.stub(console, "warn");
      AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
      assert.ok(warnStub.notCalled, "warning was not raised");
    });

    it("should warn if setup is called twice", () => {
      var warnStub = sandbox.stub(console, "warn");
      AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
      AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
      assert.ok(warnStub.calledOn, "warning was raised");
    });

    it("should not overwrite default client if called more than once", () => {
      var warnStub = sandbox.stub(console, "warn");
      AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
      var client = AppInsights.defaultClient;
      AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
      AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
      AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
      assert.ok(client === AppInsights.defaultClient, "client is not overwritten");
    });
  });

  describe("#start()", () => {
    it("should warn if start is called before setup", () => {
      var warnStub = sandbox.stub(console, "warn");
      AppInsights.start();
      assert.ok(warnStub.calledOn, "warning was raised");
    });

    it("should not warn if start is called after setup", () => {
      var warnStub = sandbox.stub(console, "warn");
      AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").start();
      assert.ok(warnStub.notCalled, "warning was not raised");
    });

    it("should not start live metrics", () => {
      AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").start();
      assert.equal(AppInsights.liveMetricsClient, undefined, "live metrics client is not defined");
    });

    it("should not start live metrics", () => {
      AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").setSendLiveMetrics(false).start();
      assert.equal(AppInsights.liveMetricsClient, undefined, "live metrics client is not defined");
    });
  });

  describe("#setAutoCollect", () => {
    it("auto-collection is initialized by default", () => {
      AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
      let consoleSpy = sandbox.spy(AppInsights.defaultClient.logHandler["_console"], "enable");
      let exceptionsSpy = sandbox.spy(
        AppInsights.defaultClient.logHandler["_exceptions"],
        "enable"
      );
      let performanceSpy = sandbox.spy(
        AppInsights.defaultClient.metricHandler["_performance"],
        "enable"
      );
      AppInsights.start();
      assert.ok(consoleSpy.called);
      assert.ok(exceptionsSpy.called);
      assert.ok(performanceSpy.called);
    });

    it("auto-collection is not initialized if disabled before 'start'", () => {
      AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333")
        .setAutoCollectConsole(false)
        .setAutoCollectExceptions(false)
        .setAutoCollectPerformance(false)
        .setAutoCollectRequests(false)
        .setAutoCollectDependencies(false)
        .setAutoDependencyCorrelation(false);
      let consoleSpy = sandbox.spy(AppInsights.defaultClient.logHandler["_console"], "enable");
      let exceptionsSpy = sandbox.spy(
        AppInsights.defaultClient.logHandler["_exceptions"],
        "enable"
      );
      let performanceSpy = sandbox.spy(
        AppInsights.defaultClient.metricHandler["_performance"],
        "enable"
      );
      AppInsights.start();
      assert.equal(consoleSpy.firstCall.args[0], false);
      assert.equal(exceptionsSpy.firstCall.args[0], false);
      assert.equal(performanceSpy.firstCall.args[0], false);
    });
  });
});
