import assert = require("assert");
import sinon = require("sinon");

import AppInsights = require("../../applicationinsights");
import TelemetryClient = require("../../Library/TelemetryClient");
import AutoCollectNativePerformance = require("../../AutoCollection/NativePerformance");

describe("AutoCollection/NativePerformance", () => {
    afterEach(() => {
        AppInsights.dispose();
    });

    if (AutoCollectNativePerformance.isNodeVersionCompatible()) {
        describe("#init and #dispose()", () => {
            it("init should enable and dispose should stop autocollection interval", () => {
                var setIntervalSpy = sinon.spy(global, "setInterval");
                var clearIntervalSpy = sinon.spy(global, "clearInterval");

                AppInsights.setup("key").setAutoCollectNativeMetrics(true).setAutoCollectPerformance(false).start();
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
    }
});
