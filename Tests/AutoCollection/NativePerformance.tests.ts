import assert = require("assert");
import sinon = require("sinon");

import AppInsights = require("../../applicationinsights");
import TelemetryClient = require("../../Library/TelemetryClient");
import { AutoCollectNativePerformance } from "../../AutoCollection/NativePerformance";
import { JsonConfig } from "../../Library/JsonConfig";
import * as Constants from "../../Declarations/Constants";

const ENV_nativeMetricsDisablers = "APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC";
const ENV_nativeMetricsDisableAll = "APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS";
describe("AutoCollection/NativePerformance", () => {
    var sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
        JsonConfig["_instance"] = undefined;
    });

    afterEach(() => {
        AppInsights.dispose();
        sandbox.restore();
    });

    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop autocollection interval", () => {
            var setIntervalSpy = sandbox.spy(global, "setInterval");
            var clearIntervalSpy = sandbox.spy(global, "clearInterval");
            const statsAddSpy = sandbox.spy(AutoCollectNativePerformance.INSTANCE["_statsbeat"], "addFeature");
            const statsRemoveSpy = sandbox.spy(AutoCollectNativePerformance.INSTANCE["_statsbeat"], "removeFeature");

            AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333")
                .setAutoCollectHeartbeat(false)
                .setAutoCollectPerformance(false, true)
                .setAutoCollectPreAggregatedMetrics(false)
                .start();
            if (AutoCollectNativePerformance["_metricsAvailable"]) {
                assert.ok(statsAddSpy.calledOnce);
                assert.strictEqual(AutoCollectNativePerformance.INSTANCE["_statsbeat"]["_feature"], Constants.StatsbeatFeature.NATIVE_METRICS + Constants.StatsbeatFeature.DISK_RETRY);
                assert.equal(setIntervalSpy.callCount, 3, "setInteval should be called three times as part of NativePerformance initialization as well as Statsbeat");
                AppInsights.dispose();
                assert.ok(statsRemoveSpy.calledOnce);
                assert.strictEqual(AutoCollectNativePerformance.INSTANCE["_statsbeat"]["_feature"], Constants.StatsbeatFeature.DISK_RETRY);
                assert.equal(clearIntervalSpy.callCount, 1, "clearInterval should be called once as part of NativePerformance shutdown");
            } else {
                assert.equal(setIntervalSpy.callCount, 2, "setInterval should not be called if NativePerformance package is not available, Statsbeat will be called");
                AppInsights.dispose();
                assert.equal(clearIntervalSpy.callCount, 0, "clearInterval should not be called if NativePerformance package is not available");
            }
        });

        it("constructor should be safe to call multiple times", () => {
            var client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            var native = new AutoCollectNativePerformance(client);
            var sinonSpy = sandbox.spy(AutoCollectNativePerformance.INSTANCE, "dispose");

            assert.ok(native);
            assert.ok(sinonSpy.notCalled);

            assert.doesNotThrow(() => { native = new AutoCollectNativePerformance(client) }, "NativePerformance can be constructed more than once");
            assert.ok(sinonSpy.calledOnce, "dispose is called when second instance is constructed");
        });

        it("Calling enable multiple times should not create multiple timers", () => {
            var client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            var sinonSpy = sandbox.spy(global, "setInterval");
            var native = new AutoCollectNativePerformance(client);
            assert.ok(native);
            assert.doesNotThrow(() => native.enable(true), "Does not throw when trying to enable");
            assert.doesNotThrow(() => native.enable(true), "Does not throw when trying to enable");
            if (AutoCollectNativePerformance["_metricsAvailable"]) {
                assert.equal(sinonSpy.callCount, 1, "setInterval should be singleton");
            }
            else{
                assert.equal(sinonSpy.callCount, 0, "setInterval should not be called if native metrics package is not installed");
            }
        });

        it("Calling enable when metrics are not available should fail gracefully", () => {
            var client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            var native = new AutoCollectNativePerformance(client);

            AutoCollectNativePerformance["_metricsAvailable"] = false;
            assert.ok(!(<any>native)["_emitter"]);

            assert.doesNotThrow(() => native.enable(true), "Does not throw when native metrics are not available and trying to enable");
            assert.doesNotThrow(() => native.enable(false), "Does not throw when native metrics are not available and trying to disable");
        });
    });

    describe("#_parseEnabled", () => {
        it("should return equal input arg if no env vars are set", () => {
            const _customConfig = JsonConfig.getInstance();
            assert.deepEqual(AutoCollectNativePerformance.parseEnabled(true, _customConfig), { isEnabled: true, disabledMetrics: {} });
            assert.deepEqual(AutoCollectNativePerformance.parseEnabled(false, _customConfig), { isEnabled: false, disabledMetrics: {} });

            const config = { gc: true, heap: true };
            assert.deepEqual(AutoCollectNativePerformance.parseEnabled(config, _customConfig), { isEnabled: true, disabledMetrics: config });
        });

        it("should overwrite input arg if disable all extended metrics env var is set", () => {
            const env = <{ [id: string]: string }>{};
            const originalEnv = process.env;

            env[ENV_nativeMetricsDisableAll] = "set";
            process.env = env;

            const _customConfig = JsonConfig.getInstance();

            assert.deepEqual(AutoCollectNativePerformance.parseEnabled(true, _customConfig), { isEnabled: false, disabledMetrics: {} });
            assert.deepEqual(AutoCollectNativePerformance.parseEnabled({}, _customConfig), { isEnabled: false, disabledMetrics: {} });
            assert.deepEqual(AutoCollectNativePerformance.parseEnabled({ gc: true }, _customConfig), { isEnabled: false, disabledMetrics: {} });

            process.env = originalEnv;
        });

        it("should overwrite input arg if individual env vars are set", () => {
            const expectation = { gc: true, heap: true };
            const env = <{ [id: string]: string }>{};
            const originalEnv = process.env;

            env[ENV_nativeMetricsDisablers] = "gc,heap";
            process.env = env;

            const _customConfig = JsonConfig.getInstance();

            let inConfig;

            inConfig = false;
            assert.deepEqual(AutoCollectNativePerformance.parseEnabled(inConfig, _customConfig), { isEnabled: false, disabledMetrics: expectation });

            inConfig = true;
            assert.deepEqual(AutoCollectNativePerformance.parseEnabled(inConfig, _customConfig), { isEnabled: true, disabledMetrics: expectation });

            inConfig = {};
            assert.deepEqual(AutoCollectNativePerformance.parseEnabled(inConfig, _customConfig), { isEnabled: true, disabledMetrics: expectation });
            inConfig = { gc: true };
            assert.deepEqual(AutoCollectNativePerformance.parseEnabled(inConfig, _customConfig), { isEnabled: true, disabledMetrics: expectation });
            inConfig = { loop: true };

            assert.deepEqual(AutoCollectNativePerformance.parseEnabled(inConfig, _customConfig), { isEnabled: true, disabledMetrics: { ...inConfig, ...expectation } });
            inConfig = { gc: false, loop: true, heap: 'abc', something: 'else' };
            assert.deepEqual(AutoCollectNativePerformance.parseEnabled(<any>inConfig, _customConfig), { isEnabled: true, disabledMetrics: { ...inConfig, ...expectation } });

            process.env = originalEnv;
        });
    });
});
