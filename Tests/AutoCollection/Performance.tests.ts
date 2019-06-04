import assert = require("assert");
import sinon = require("sinon");

import AppInsights = require("../../applicationinsights");

describe("AutoCollection/Performance", () => {
    afterEach(() => {
        AppInsights.dispose();
    });
    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop autocollection interval", () => {
            var setIntervalSpy = sinon.spy(global, "setInterval");
            var clearIntervalSpy = sinon.spy(global, "clearInterval");
            AppInsights.setup("key").setAutoCollectPerformance(true, false).start();
            assert.equal(setIntervalSpy.callCount, 1, "setInteval should be called once as part of performance initialization");
            AppInsights.dispose();
            assert.equal(clearIntervalSpy.callCount, 1, "clearInterval should be called once as part of performance shutdown");

            setIntervalSpy.restore();
            clearIntervalSpy.restore();
        });
    });
});