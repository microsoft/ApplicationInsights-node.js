import { SpanKind } from "@opentelemetry/api";
import * as assert from "assert";
import * as sinon from "sinon";
import { PerformanceCounterMetricsHandler } from "../../../src/metrics/handlers";
import { NativeMetricsCounter, PerformanceCounter } from "../../../src/metrics/types";
import { ApplicationInsightsConfig } from "../../../src/shared";

describe("PerformanceCounterMetricsHandler", () => {
    let sandbox: sinon.SinonSandbox;
    let autoCollect: PerformanceCounterMetricsHandler;

    before(() => {
        sandbox = sinon.createSandbox();
        const config = new ApplicationInsightsConfig();
        config.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
        config.extendedMetrics.heap = true;
        config.extendedMetrics.loop = true;
        config.extendedMetrics.gc = true;
        autoCollect = new PerformanceCounterMetricsHandler(config, { collectionInterval: 100 });
        sandbox.stub(autoCollect["_metricReader"]["_exporter"], "export");
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#Metrics", () => {
        it("should create instruments", () => {
            assert.ok(
                autoCollect["_processMetrics"]["_memoryPrivateBytesGauge"],
                "_memoryPrivateBytesGauge not available"
            );
            assert.ok(
                autoCollect["_processMetrics"]["_memoryAvailableBytesGauge"],
                "_memoryAvailableBytesGauge not available"
            );
            assert.ok(
                autoCollect["_processMetrics"]["_processorTimeGauge"],
                "_processorTimeGauge not available"
            );
            assert.ok(
                autoCollect["_processMetrics"]["_processTimeGauge"],
                "_processTimeGauge not available"
            );
            assert.ok(
                autoCollect["_requestMetrics"]["_requestRateGauge"],
                "_dependencyDurationGauge not available"
            );
        });

        it("should observe instruments during collection", async () => {
            const mockExport = sandbox.stub(autoCollect["_azureExporter"], "export");
            await new Promise((resolve) => setTimeout(resolve, 120));
            assert.ok(mockExport.called);
            const resourceMetrics = mockExport.args[0][0];
            const scopeMetrics = resourceMetrics.scopeMetrics;
            assert.strictEqual(scopeMetrics.length, 1, "scopeMetrics count");
            let metrics = scopeMetrics[0].metrics;
            assert.strictEqual(metrics.length, 6, "metrics count");
            assert.equal(metrics[0].descriptor.name, PerformanceCounter.PRIVATE_BYTES);
            assert.equal(metrics[1].descriptor.name, PerformanceCounter.AVAILABLE_BYTES);
            assert.equal(metrics[2].descriptor.name, PerformanceCounter.PROCESSOR_TIME);
            assert.equal(metrics[3].descriptor.name, PerformanceCounter.PROCESS_TIME);
            assert.equal(metrics[4].descriptor.name, PerformanceCounter.REQUEST_DURATION);
            assert.equal(metrics[5].descriptor.name, PerformanceCounter.REQUEST_RATE);
        });

        it("should not collect when disabled", async () => {
            const mockExport = sandbox.stub(autoCollect["_azureExporter"], "export");
            autoCollect.shutdown();
            await new Promise((resolve) => setTimeout(resolve, 120));
            assert.ok(mockExport.notCalled);
        });

        it("should add correct views", () => {
            const config = new ApplicationInsightsConfig();
            config.azureMonitorExporterConfig.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
            config.extendedMetrics.heap = false;
            config.extendedMetrics.loop = false;
            config.extendedMetrics.gc = false;
            const autoCollect = new PerformanceCounterMetricsHandler(config);
            let views = autoCollect["_getViews"]();
            assert.equal(views.length, 11);
        });
    });
});
