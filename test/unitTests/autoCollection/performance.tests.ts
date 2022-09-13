import { MetricData } from "@opentelemetry/sdk-metrics";
import * as assert from "assert";
import * as sinon from "sinon";
import { PerformanceCounterMetricsHandler } from "../../../src/autoCollection";
import { NativeMetricsCounter, PerformanceCounter, QuickPulseCounter } from "../../../src/autoCollection/metrics/types";
import { Config } from "../../../src/library/configuration";
import { MetricHandler } from "../../../src/library/handlers";


describe("PerformanceCounterMetricsHandler", () => {
    var sandbox: sinon.SinonSandbox;
    let autoCollect: PerformanceCounterMetricsHandler;

    before(() => {
        sandbox = sinon.createSandbox();
        let config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        autoCollect = new PerformanceCounterMetricsHandler(config, { collectionInterval: 100 });
        sandbox.stub(autoCollect["_metricReader"]["_exporter"], "export");
    })

    afterEach(() => {
        sandbox.restore();
    });

    describe("#Metrics", () => {
        it("should create instruments", () => {
            assert.ok(autoCollect.getProcessMetrics()["_memoryPrivateBytesGauge"], "_dependencyDurationGauge not available");
            assert.ok(autoCollect.getProcessMetrics()["_memoryAvailableBytesGauge"], "_dependencyDurationGauge not available");
            assert.ok(autoCollect.getProcessMetrics()["_processorTimeGauge"], "_dependencyDurationGauge not available");
            assert.ok(autoCollect.getProcessMetrics()["_processTimeGauge"], "_dependencyDurationGauge not available");
            assert.ok(autoCollect.getRequestMetrics()["_requestRateGauge"], "_dependencyDurationGauge not available");
            assert.ok(autoCollect.getRequestMetrics()["_requestDurationGauge"], "_dependencyDurationGauge not available");
            assert.ok(autoCollect.getProcessMetrics()["_memoryCommittedBytesGauge"], "_memoryCommittedBytesGauge not available");
            assert.ok(autoCollect.getRequestMetrics()["_requestFailureRateGauge"], "_requestFailureRateGauge not available");
            // assert.ok(autoCollect.getDependencyMetrics()["_dependencyFailureRateGauge"], "_dependencyFailureRateGauge not available");
            // assert.ok(autoCollect.getDependencyMetrics()["_dependencyRateGauge"], "_dependencyRateGauge not available");
            // assert.ok(autoCollect.getDependencyMetrics()["_dependencyDurationGauge"], "_dependencyDurationGauge not available");
            // assert.ok(autoCollect.getExceptionMetrics()["_exceptionsGauge"], "_exceptionRateGauge not available");
        });

        it("should observe instruments during collection", async () => {
            let mockExport = sandbox.stub(autoCollect["_azureExporter"], "export");
            autoCollect.start();
            await new Promise(resolve => setTimeout(resolve, 120));
            assert.ok(mockExport.called);
            let resourceMetrics = mockExport.args[0][0];
            const scopeMetrics = resourceMetrics.scopeMetrics;
            assert.strictEqual(scopeMetrics.length, 1, 'scopeMetrics count');
            const metrics = scopeMetrics[0].metrics;
            assert.strictEqual(metrics.length, 13, 'metrics count');
            assert.equal(metrics[0].descriptor.name, PerformanceCounter.PRIVATE_BYTES);
            assert.equal(metrics[1].descriptor.name, PerformanceCounter.AVAILABLE_BYTES);
            assert.equal(metrics[2].descriptor.name, PerformanceCounter.PROCESSOR_TIME);
            assert.equal(metrics[3].descriptor.name, PerformanceCounter.PROCESS_TIME);
            assert.equal(metrics[4].descriptor.name, PerformanceCounter.REQUEST_RATE);
            assert.equal(metrics[5].descriptor.name, PerformanceCounter.REQUEST_DURATION);
            assert.equal(metrics[6].descriptor.name, NativeMetricsCounter.EVENT_LOOP_CPU);
            assert.equal(metrics[7].descriptor.name, NativeMetricsCounter.GARBAGE_COLLECTION_SCAVENGE);
            assert.equal(metrics[8].descriptor.name, NativeMetricsCounter.GARBAGE_COLLECTION_SWEEP_COMPACT);
            assert.equal(metrics[9].descriptor.name, NativeMetricsCounter.GARBAGE_COLLECTION_INCREMENTAL_MARKING);
            assert.equal(metrics[10].descriptor.name, NativeMetricsCounter.HEAP_MEMORY_TOTAL);
            assert.equal(metrics[11].descriptor.name, NativeMetricsCounter.HEAP_MEMORY_USAGE);
            assert.equal(metrics[12].descriptor.name, NativeMetricsCounter.MEMORY_USAGE_NON_HEAP);
        });


        it("should not collect when disabled", async () => {
            let mockExport = sandbox.stub(autoCollect["_azureExporter"], "export");
            autoCollect.start();
            autoCollect.shutdown();
            await new Promise(resolve => setTimeout(resolve, 120));
            assert.ok(mockExport.notCalled);
        });
    });
});
