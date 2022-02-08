import * as assert from "assert";
import * as sinon from "sinon";

import * as AppInsights from "../../../applicationinsights";

describe("AutoCollection/Performance", () => {
    var sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        AppInsights.dispose();
        sandbox.restore();
    });

    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop autocollection interval", () => {
            var setIntervalSpy = sandbox.spy(global, "setInterval");
            var clearIntervalSpy = sandbox.spy(global, "clearInterval");
            AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333")
                .setAutoCollectHeartbeat(false)
                .setAutoCollectPerformance(true, false)
                .setAutoCollectPreAggregatedMetrics(false)
                .start();
            assert.equal(setIntervalSpy.callCount, 3, "setInteval should be called three times as part of performance initialization and also as part of Statsbeat");
            AppInsights.dispose();
            assert.equal(clearIntervalSpy.callCount, 1, "clearInterval should be called once as part of performance shutdown");


        });
    });
});
