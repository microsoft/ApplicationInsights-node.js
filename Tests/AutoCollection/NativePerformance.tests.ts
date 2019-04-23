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

                AppInsights.setup("key").setAutoCollectPerformance(false, true).start();
                assert.equal(setIntervalSpy.callCount, 1, "setInterval should be called once as part of NativePerformance initialization");

                AppInsights.dispose();
                assert.equal(clearIntervalSpy.callCount, 1, "clearInterval should be caleld once as part of NativePerformance shutdown");

                setIntervalSpy.restore();
                clearIntervalSpy.restore();
            });

            it("constructor should be safe to call multiple times", () => {
                var client = new TelemetryClient("key");
                var native = new AutoCollectNativePerformance(client);
                var disposeSpy = sinon.spy(AutoCollectNativePerformance.INSTANCE, "dispose");

                assert.ok(native);
                assert.ok(disposeSpy.notCalled);

                assert.doesNotThrow(() => {native = new AutoCollectNativePerformance(client)}, "NativePerformance can be constructed more than once");
                assert.ok(disposeSpy.calledOnce, "dispose is called when second instance is constructed");
            });

            it("Calling enable when metrics are not available should fail gracefully", () => {
                var client = new TelemetryClient("key");
                var native = new AutoCollectNativePerformance(client);

                AutoCollectNativePerformance["_metricsAvailable"] = false;
                assert.ok(!(<any>native)["_emitter"]);

                assert.doesNotThrow(() => native.enable(true), "Does not throw when native metrics are not available and trying to enable");
                assert.doesNotThrow(() => native.enable(false), "Does not throw when native metrics are not available and trying to disable");
            });
        });

        describe("#_parseEnabled", () =>{
            it("should return strictly equal input arg if no env vars are set", () => {
                assert.equal(AutoCollectNativePerformance["_parseEnabled"](true), true);
                assert.equal(AutoCollectNativePerformance["_parseEnabled"](false), false);

                const config = {gc: true, heap: true};
                assert.strictEqual(AutoCollectNativePerformance["_parseEnabled"](config), config);
            });

            it("should overwrite input arg if disable all extended metrics env var is set", () => {
                const env = <{[id: string]: string}>{};
                const originalEnv = process.env;

                env[Config.ENV_nativeMetricsDisableAll] = "set";
                process.env = env;

                assert.deepEqual(AutoCollectNativePerformance["_parseEnabled"](true), false);
                assert.deepEqual(AutoCollectNativePerformance["_parseEnabled"]({}), false);
                assert.deepEqual(AutoCollectNativePerformance["_parseEnabled"]({gc: true}), false);

                process.env = originalEnv;
            });

            it("should overwrite input arg if individual env vars are set", () => {
                const expectation = {gc: true, heap: true};
                const env = <{[id: string]: string}>{};
                const originalEnv = process.env;

                env[Config.ENV_nativeMetricsDisablers] = "gc,heap";
                process.env = env;

                let inConfig;

                inConfig = true;
                assert.deepEqual(AutoCollectNativePerformance["_parseEnabled"](inConfig), expectation);

                inConfig = {};
                assert.deepEqual(AutoCollectNativePerformance["_parseEnabled"](inConfig), expectation);
                inConfig = {gc: true};
                assert.deepEqual(AutoCollectNativePerformance["_parseEnabled"](inConfig), expectation);
                inConfig = {loop: true};

                assert.deepEqual(AutoCollectNativePerformance["_parseEnabled"](inConfig), {...inConfig, ...expectation});
                inConfig = {gc: false, loop: true, heap: 'abc', something: 'else'};
                assert.deepEqual(AutoCollectNativePerformance["_parseEnabled"](<any>inConfig), {...inConfig, ...expectation});

                process.env = originalEnv;
            });
        });
    }
});
