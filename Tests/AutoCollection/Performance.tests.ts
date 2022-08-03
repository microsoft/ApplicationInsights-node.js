import assert = require("assert");
import sinon = require("sinon");

import AppInsights = require("../../applicationinsights");
import Performance = require("../../AutoCollection/Performance");
import TelemetryClient = require("../../Library/TelemetryClient");

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

    describe("#trackNetwork()", () => {
        it("should not produce incorrect metrics because of multiple instances of Performance class", (done) => {
            const setIntervalStub = sandbox.stub(global, "setInterval", () => ({ unref: () => { } }));
            const clearIntervalSpy = sandbox.spy(global, "clearInterval");
            const appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").setAutoCollectPerformance(false).start();
            const performance1 = new Performance(new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"), 1234, false);
            const performance2 = new Performance(new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"), 4321, true);
            performance1.enable(true);
            performance2.enable(true);
            Performance.INSTANCE.enable(true);
            const stub1 = sandbox.stub(performance1["_client"], "trackMetric");
            const stub2 = sandbox.stub(performance2["_client"], "trackMetric");

            Performance.countRequest(1000, true);
            Performance.countRequest(2000, true);
            performance1["_trackNetwork"]();
            performance2["_trackNetwork"]();
            Performance.countRequest(5000, true);
            const prev1 = performance1["_lastIntervalRequestExecutionTime"];
            const prev2 = performance2["_lastIntervalRequestExecutionTime"];
            assert.deepEqual(prev1, prev2);
            assert.deepEqual(prev1, 1000 + 2000);

            // Add to end of event loop
            setTimeout(() => {
                assert.equal(Performance["_intervalRequestExecutionTime"], 1000 + 2000 + 5000);
                assert.equal(stub1.callCount, 2, "calls trackMetric for the 2 standard metrics");
                assert.equal(stub2.callCount, 3, "calls trackMetric for the 3 live metric counters");
                assert.equal(stub2.args[1][0].value, stub1.args[1][0].value);
                assert.equal(stub1.args[1][0].value, (1000 + 2000) / 2, "request duration average should be 1500");

                stub1.reset();
                stub2.reset();

                setTimeout(() => {
                    // need to wait at least 1 ms so trackNetwork has valid elapsedMs value
                    performance1["_trackNetwork"]();
                    performance2["_trackNetwork"]();
                    assert.equal(stub1.callCount, 2, "calls trackMetric for the 2 standard metrics");
                    assert.equal(stub2.callCount, 3, "calls trackMetric for the 3 live metric counters");
                    assert.equal(stub2.args[1][0].value, stub1.args[1][0].value);
                    assert.equal(stub1.args[1][0].value, (5000) / 1, "request duration average should be 5000");

                    appInsights.setAutoCollectPerformance(true); // set back to default of true so tests expecting the default can pass
                    Performance.INSTANCE.dispose();
                    performance1.dispose();
                    performance2.dispose();
                    done();
                }, 100);
            }, 100);
        });
    });
});
