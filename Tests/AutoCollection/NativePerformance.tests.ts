import assert = require("assert");
import sinon = require("sinon");

import AppInsights = require("../../applicationinsights");
import TelemetryClient = require("../../Library/TelemetryClient");
import Config = require("../../Library/Config");
import { AutoCollectNativePerformance } from "../../AutoCollection/NativePerformance";

describe("AutoCollection/NativePerformance", () => {
    afterEach(() => {
        AppInsights.dispose();
    });

    if (AutoCollectNativePerformance.isNodeVersionCompatible()) {
        describe("#init and #dispose()", () => {
            it("init should enable and dispose should stop autocollection interval", () => {
                var setIntervalSpy = sinon.spy(global, "setInterval");
                var clearIntervalSpy = sinon.spy(global, "clearInterval");

                AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333")
                    .setAutoCollectHeartbeat(false)
                    .setAutoCollectPerformance(false, true)
                    .start();
                if (AutoCollectNativePerformance["_metricsAvailable"]) {
                    assert.equal(setIntervalSpy.callCount, 1, "setInterval should be called once as part of NativePerformance initialization");
                    AppInsights.dispose();
                    assert.equal(clearIntervalSpy.callCount, 1, "clearInterval should be called once as part of NativePerformance shutdown");
                } else {
                    assert.equal(setIntervalSpy.callCount, 0, "setInterval should not be called if NativePerformance package is not available");
                    AppInsights.dispose();
                    assert.equal(clearIntervalSpy.callCount, 0, "clearInterval should not be called if NativePerformance package is not available");
                }

                setIntervalSpy.restore();
                clearIntervalSpy.restore();
            });

            it("constructor should be safe to call multiple times", () => {
                var client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                var native = new AutoCollectNativePerformance(client);
                var disposeSpy = sinon.spy(AutoCollectNativePerformance.INSTANCE, "dispose");

                assert.ok(native);
                assert.ok(disposeSpy.notCalled);

                assert.doesNotThrow(() => {native = new AutoCollectNativePerformance(client)}, "NativePerformance can be constructed more than once");
                assert.ok(disposeSpy.calledOnce, "dispose is called when second instance is constructed");
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

        describe("#_parseEnabled", () =>{
            it("should return equal input arg if no env vars are set", () => {
                assert.deepEqual(AutoCollectNativePerformance.parseEnabled(true), {isEnabled: true, disabledMetrics: {}});
                assert.deepEqual(AutoCollectNativePerformance.parseEnabled(false), {isEnabled: false, disabledMetrics: {}});

                const config = {gc: true, heap: true};
                assert.deepEqual(AutoCollectNativePerformance.parseEnabled(config), {isEnabled: true, disabledMetrics: config});
            });

            it("should overwrite input arg if disable all extended metrics env var is set", () => {
                const env = <{[id: string]: string}>{};
                const originalEnv = process.env;

                env[Config.ENV_nativeMetricsDisableAll] = "set";
                process.env = env;

                assert.deepEqual(AutoCollectNativePerformance.parseEnabled(true), {isEnabled: false, disabledMetrics: {}});
                assert.deepEqual(AutoCollectNativePerformance.parseEnabled({}), {isEnabled: false, disabledMetrics: {}});
                assert.deepEqual(AutoCollectNativePerformance.parseEnabled({gc: true}), {isEnabled: false, disabledMetrics: {}});

                process.env = originalEnv;
            });

            it("should overwrite input arg if individual env vars are set", () => {
                const expectation = {gc: true, heap: true};
                const env = <{[id: string]: string}>{};
                const originalEnv = process.env;

                env[Config.ENV_nativeMetricsDisablers] = "gc,heap";
                process.env = env;

                let inConfig;

                inConfig = false;
                assert.deepEqual(AutoCollectNativePerformance.parseEnabled(inConfig), {isEnabled: false, disabledMetrics: expectation});

                inConfig = true;
                assert.deepEqual(AutoCollectNativePerformance.parseEnabled(inConfig), {isEnabled: true, disabledMetrics: expectation});

                inConfig = {};
                assert.deepEqual(AutoCollectNativePerformance.parseEnabled(inConfig), {isEnabled: true, disabledMetrics: expectation});
                inConfig = {gc: true};
                assert.deepEqual(AutoCollectNativePerformance.parseEnabled(inConfig), {isEnabled: true, disabledMetrics: expectation});
                inConfig = {loop: true};

                assert.deepEqual(AutoCollectNativePerformance.parseEnabled(inConfig), {isEnabled: true, disabledMetrics: {...inConfig, ...expectation}});
                inConfig = {gc: false, loop: true, heap: 'abc', something: 'else'};
                assert.deepEqual(AutoCollectNativePerformance.parseEnabled(<any>inConfig), {isEnabled: true, disabledMetrics: {...inConfig, ...expectation}});

                process.env = originalEnv;
            });
        });
    }
});
