import * as assert from "assert";
import * as sinon from "sinon";
import { AutoCollectPerformance } from "../../../src/autoCollection";
import { Config } from "../../../src/library/configuration";
import { MetricHandler } from "../../../src/library/handlers";


describe("AutoCollection/Performance", () => {
    var sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#Metrics", () => {
        it("should create instruments and add correct callbacks", () => {
            let metricHandler = new MetricHandler(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
            let performance = new AutoCollectPerformance(metricHandler.getMeter());

            assert.ok(performance["_memoryPrivateBytesGauge"], "_dependencyDurationGauge not available");
            assert.ok(performance["_memoryAvailableBytesGauge"], "_dependencyDurationGauge not available");
            assert.ok(performance["_processorTimeGauge"], "_dependencyDurationGauge not available");
            assert.ok(performance["_processTimeGauge"], "_dependencyDurationGauge not available");
            assert.ok(performance["_requestRateGauge"], "_dependencyDurationGauge not available");
            assert.ok(performance["_requestDurationGauge"], "_dependencyDurationGauge not available");
            // Live metrics gauges
            assert.ok(performance["_memoryCommittedBytesGauge"], "_memoryCommittedBytesGauge not available");
            assert.ok(performance["_requestFailureRateGauge"], "_requestFailureRateGauge not available");
            assert.ok(performance["_dependencyFailureRateGauge"], "_dependencyFailureRateGauge not available");
            assert.ok(performance["_dependencyRateGauge"], "_dependencyRateGauge not available");
            assert.ok(performance["_dependencyDurationGauge"], "_dependencyDurationGauge not available");
            assert.ok(performance["_exceptionRateGauge"], "_exceptionRateGauge not available");
            
            //metricHandler["_metricReader"].collect();
            
        });
    });
});
