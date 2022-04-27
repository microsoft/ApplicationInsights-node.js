import * as assert from "assert";
import * as sinon from "sinon";

import * as AppInsights from "../../../src/applicationinsights";
import { TelemetryClient } from "../../../src/library";
import { AutoCollectNativePerformance } from "../../../src/autoCollection/nativePerformance";
import { JsonConfig } from "../../../src/library/configuration";

const ENV_nativeMetricsDisablers = "APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC";
const ENV_nativeMetricsDisableAll = "APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS";
describe("AutoCollection/NativePerformance", () => {
  var sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    JsonConfig["_instance"] = undefined;
  });

  afterEach(() => {
    AppInsights.dispose();
    sandbox.restore();
  });

  describe("#init and #dispose()", () => {
    it("init should enable and dispose should stop auto collection interval", () => {
      var setIntervalSpy = sandbox.spy(global, "setInterval");
      var clearIntervalSpy = sandbox.spy(global, "clearInterval");

      AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333")
        .setAutoCollectHeartbeat(false)
        .setAutoCollectPerformance(false, true)
        .setAutoCollectPreAggregatedMetrics(false)
        .start();
      if (AppInsights.defaultClient.metricHandler["_nativePerformance"]["_metricsAvailable"]) {
        assert.equal(
          setIntervalSpy.callCount,
          3,
          "setInterval should be called three times as part of NativePerformance initialization as well as Statsbeat"
        );
        AppInsights.dispose();
        assert.equal(
          clearIntervalSpy.callCount,
          1,
          "clearInterval should be called once as part of NativePerformance shutdown"
        );
      } else {
        assert.equal(
          setIntervalSpy.callCount,
          2,
          "setInterval should not be called if NativePerformance package is not available, Statsbeat will be called"
        );
        AppInsights.dispose();
        assert.equal(
          clearIntervalSpy.callCount,
          0,
          "clearInterval should not be called if NativePerformance package is not available"
        );
      }
    });

    it("Calling enable multiple times should not create multiple timers", () => {
      var client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
      var sinonSpy = sandbox.spy(global, "setInterval");
      var native = new AutoCollectNativePerformance(client.metricHandler);
      native["_metricsAvailable"] = true;
      native["_emitter"] = {
        enable: () => {},
      };

      assert.ok(native);
      assert.doesNotThrow(() => native.enable(true), "Does not throw when trying to enable");
      assert.doesNotThrow(() => native.enable(true), "Does not throw when trying to enable");
      assert.equal(sinonSpy.callCount, 1, "setInterval should be singleton");
    });

    it("Calling enable when metrics are not available should fail gracefully", () => {
      var client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
      var native = new AutoCollectNativePerformance(client.metricHandler);

      native["_metricsAvailable"] = false;
      assert.ok(!(<any>native)["_emitter"]);

      assert.doesNotThrow(
        () => native.enable(true),
        "Does not throw when native metrics are not available and trying to enable"
      );
      assert.doesNotThrow(
        () => native.enable(false),
        "Does not throw when native metrics are not available and trying to disable"
      );
    });
  });

  describe("#_parseEnabled", () => {
    it("should return equal input arg if no env vars are set", () => {
      var native = new AutoCollectNativePerformance(null);
      const _customConfig = JsonConfig.getInstance();
      assert.deepEqual(native.parseEnabled(true, _customConfig), {
        isEnabled: true,
        disabledMetrics: {},
      });
      assert.deepEqual(native.parseEnabled(false, _customConfig), {
        isEnabled: false,
        disabledMetrics: {},
      });

      const config = { gc: true, heap: true };
      assert.deepEqual(native.parseEnabled(config, _customConfig), {
        isEnabled: true,
        disabledMetrics: config,
      });
    });

    it("should overwrite input arg if disable all extended metrics env var is set", () => {
      var native = new AutoCollectNativePerformance(null);
      const env = <{ [id: string]: string }>{};
      const originalEnv = process.env;

      env[ENV_nativeMetricsDisableAll] = "set";
      process.env = env;

      const _customConfig = JsonConfig.getInstance();

      assert.deepEqual(native.parseEnabled(true, _customConfig), {
        isEnabled: false,
        disabledMetrics: {},
      });
      assert.deepEqual(native.parseEnabled({}, _customConfig), {
        isEnabled: false,
        disabledMetrics: {},
      });
      assert.deepEqual(native.parseEnabled({ gc: true }, _customConfig), {
        isEnabled: false,
        disabledMetrics: {},
      });

      process.env = originalEnv;
    });

    it("should overwrite input arg if individual env vars are set", () => {
      var native = new AutoCollectNativePerformance(null);
      const expectation = { gc: true, heap: true };
      const env = <{ [id: string]: string }>{};
      const originalEnv = process.env;

      env[ENV_nativeMetricsDisablers] = "gc,heap";
      process.env = env;

      const _customConfig = JsonConfig.getInstance();

      let inConfig;

      inConfig = false;
      assert.deepEqual(native.parseEnabled(inConfig, _customConfig), {
        isEnabled: false,
        disabledMetrics: expectation,
      });

      inConfig = true;
      assert.deepEqual(native.parseEnabled(inConfig, _customConfig), {
        isEnabled: true,
        disabledMetrics: expectation,
      });

      inConfig = {};
      assert.deepEqual(native.parseEnabled(inConfig, _customConfig), {
        isEnabled: true,
        disabledMetrics: expectation,
      });
      inConfig = { gc: true };
      assert.deepEqual(native.parseEnabled(inConfig, _customConfig), {
        isEnabled: true,
        disabledMetrics: expectation,
      });
      inConfig = { loop: true };

      assert.deepEqual(native.parseEnabled(inConfig, _customConfig), {
        isEnabled: true,
        disabledMetrics: { ...inConfig, ...expectation },
      });
      inConfig = { gc: false, loop: true, heap: "abc", something: "else" };
      assert.deepEqual(native.parseEnabled(<any>inConfig, _customConfig), {
        isEnabled: true,
        disabledMetrics: { ...inConfig, ...expectation },
      });

      process.env = originalEnv;
    });
  });
});
