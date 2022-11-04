import { SpanKind } from "@opentelemetry/api";
import * as assert from "assert";
import * as sinon from "sinon";
import { PerformanceCounterMetricsHandler } from "../../../src/autoCollection";
import {
    NativeMetricsCounter,
    PerformanceCounter,
} from "../../../src/autoCollection/metrics/types";
import { Config } from "../../../src/library/configuration";

describe("PerformanceCounterMetricsHandler", () => {
    var sandbox: sinon.SinonSandbox;
    let autoCollect: PerformanceCounterMetricsHandler;

    before(() => {
        sandbox = sinon.createSandbox();
        let config = new Config();
        config.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
        config.extendedMetrics.heap = true;
        config.extendedMetrics.loop = true;
        config.extendedMetrics.gc = true;
        autoCollect = new PerformanceCounterMetricsHandler(config, { collectionInterval: 100 });
        autoCollect["_nativeMetrics"]["_metricsAvailable"] = false;
        sandbox.stub(autoCollect["_metricReader"]["_exporter"], "export");
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#Metrics", () => {
        it("should create instruments", () => {
            assert.ok(
                autoCollect.getHttpMetricsInstrumentation()["_httpServerDurationHistogram"],
                "_httpServerDurationHistogram not available"
            );
            assert.ok(
                autoCollect.getProcessMetrics()["_memoryPrivateBytesGauge"],
                "_memoryPrivateBytesGauge not available"
            );
            assert.ok(
                autoCollect.getProcessMetrics()["_memoryAvailableBytesGauge"],
                "_memoryAvailableBytesGauge not available"
            );
            assert.ok(
                autoCollect.getProcessMetrics()["_processorTimeGauge"],
                "_processorTimeGauge not available"
            );
            assert.ok(
                autoCollect.getProcessMetrics()["_processTimeGauge"],
                "_processTimeGauge not available"
            );
            assert.ok(
                autoCollect.getRequestMetrics()["_requestRateGauge"],
                "_dependencyDurationGauge not available"
            );

            assert.ok(
                autoCollect["_nativeMetrics"]["_eventLoopHistogram"],
                "_eventLoopHistogram not available"
            );
            assert.ok(
                autoCollect["_nativeMetrics"]["_garbageCollectionScavenge"],
                "_garbageCollectionScavenge not available"
            );
            assert.ok(
                autoCollect["_nativeMetrics"]["_garbageCollectionMarkSweepCompact"],
                "_garbageCollectionMarkSweepCompact not available"
            );
            assert.ok(
                autoCollect["_nativeMetrics"]["_garbageCollectionIncrementalMarking"],
                "_garbageCollectionIncrementalMarking not available"
            );
            assert.ok(
                autoCollect["_nativeMetrics"]["_heapMemoryTotalGauge"],
                "_heapMemoryTotalGauge not available"
            );
            assert.ok(
                autoCollect["_nativeMetrics"]["_heapMemoryUsageGauge"],
                "_heapMemoryUsageGauge not available"
            );
            assert.ok(
                autoCollect["_nativeMetrics"]["_memoryUsageNonHeapGauge"],
                "_memoryUsageNonHeapGauge not available"
            );
        });

        it("should observe instruments during collection", async () => {
            let mockExport = sandbox.stub(autoCollect["_azureExporter"], "export");
            autoCollect.start();
            autoCollect
                .getHttpMetricsInstrumentation()
                .setMeterProvider(autoCollect["_meterProvider"]);
            autoCollect.getHttpMetricsInstrumentation()["_httpRequestDone"]({
                startTime: Date.now() - 100,
                isProcessed: false,
                spanKind: SpanKind.SERVER,
                attributes: { HTTP_STATUS_CODE: "200" },
            });

            await new Promise((resolve) => setTimeout(resolve, 120));
            assert.ok(mockExport.called);
            let resourceMetrics = mockExport.args[0][0];
            const scopeMetrics = resourceMetrics.scopeMetrics;
            assert.strictEqual(scopeMetrics.length, 2, "scopeMetrics count");
            let metrics = scopeMetrics[0].metrics;
            assert.strictEqual(metrics.length, 12, "metrics count");
            assert.equal(metrics[0].descriptor.name, PerformanceCounter.PRIVATE_BYTES);
            assert.equal(metrics[1].descriptor.name, PerformanceCounter.AVAILABLE_BYTES);
            assert.equal(metrics[2].descriptor.name, PerformanceCounter.PROCESSOR_TIME);
            assert.equal(metrics[3].descriptor.name, PerformanceCounter.PROCESS_TIME);
            assert.equal(metrics[4].descriptor.name, PerformanceCounter.REQUEST_RATE);
            assert.equal(metrics[5].descriptor.name, NativeMetricsCounter.EVENT_LOOP_CPU);
            assert.equal(
                metrics[6].descriptor.name,
                NativeMetricsCounter.GARBAGE_COLLECTION_SCAVENGE
            );
            assert.equal(
                metrics[7].descriptor.name,
                NativeMetricsCounter.GARBAGE_COLLECTION_SWEEP_COMPACT
            );
            assert.equal(
                metrics[8].descriptor.name,
                NativeMetricsCounter.GARBAGE_COLLECTION_INCREMENTAL_MARKING
            );
            assert.equal(metrics[9].descriptor.name, NativeMetricsCounter.HEAP_MEMORY_TOTAL);
            assert.equal(metrics[10].descriptor.name, NativeMetricsCounter.HEAP_MEMORY_USAGE);
            assert.equal(metrics[11].descriptor.name, NativeMetricsCounter.MEMORY_USAGE_NON_HEAP);
            metrics = scopeMetrics[1].metrics;
            assert.strictEqual(metrics.length, 1, "metrics count");
            assert.equal(metrics[0].descriptor.name, PerformanceCounter.REQUEST_DURATION);
        });

        it("should not collect when disabled", async () => {
            let mockExport = sandbox.stub(autoCollect["_azureExporter"], "export");
            autoCollect.start();
            autoCollect.shutdown();
            await new Promise((resolve) => setTimeout(resolve, 120));
            assert.ok(mockExport.notCalled);
        });

        it("should add correct views", () => {
            let config = new Config();
            config.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
            config.extendedMetrics.heap = false;
            config.extendedMetrics.loop = false;
            config.extendedMetrics.gc = false;
            let autoCollect = new PerformanceCounterMetricsHandler(config);
            autoCollect["_nativeMetrics"]["_metricsAvailable"] = false;
            let views = autoCollect["_getViews"]();
            assert.equal(views.length, 18); // All Native metrics ignore views are added
            config.extendedMetrics.heap = true;
            config.extendedMetrics.loop = true;
            config.extendedMetrics.gc = true;
            views = autoCollect["_getViews"]();
            assert.equal(views.length, 11);
        });
    });
});