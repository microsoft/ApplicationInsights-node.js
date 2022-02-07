import * as assert from "assert";
import * as sinon from "sinon";

import AppInsights } from "../../../applicationinsights");
import AutoCollectPreAggregatedMetrics } from "../../../AutoCollection/PreAggregatedMetrics");
import TelemetryClient } from "../../../Library/TelemetryClient");

describe("AutoCollection/PreAggregatedMetrics", () => {
    var sandbox: sinon.SinonSandbox;

    before(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop auto collection interval", () => {
            var setIntervalSpy = sandbox.spy(global, "setInterval");
            var clearIntervalSpy = sandbox.spy(global, "clearInterval");
            let client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            let metrics = new AutoCollectPreAggregatedMetrics(client);
            metrics.enable(true);
            assert.equal(setIntervalSpy.callCount, 2, "setInterval should be called three times as part of PreAggregatedMetrics initialization");
            assert.equal(clearIntervalSpy.callCount, 1, "clearInterval should be called once as part of PreAggregatedMetrics shutdown");
        });
    });
});
