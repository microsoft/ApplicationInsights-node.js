import assert = require("assert");
import sinon = require("sinon");

import AppInsights = require("../../applicationinsights");

describe("AutoCollection/NativePerformance", () => {
    afterEach(() => {
        AppInsights.dispose();
    });

    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop autocollection interval", () => {
            var setIntervalSpy = sinon.spy(global, "setInterval");
            var clearIntervalSpy = sinon.spy(global, "clearInterval");

            AppInsights.setup("key").setAutoCollectNativeMetrics(true).start();
            assert.equal(setIntervalSpy.callCount, 1, "setInterval should be called once as part of NativePerformance initialization");

            AppInsights.dispose();
            assert.equal(clearIntervalSpy.callCount, 1, "clearInterval should be caleld once as part of NativePerformance shutdown");

            setIntervalSpy.restore();
            clearIntervalSpy.restore();
        });
    });
});