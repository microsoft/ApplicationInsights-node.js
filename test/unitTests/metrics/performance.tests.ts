import { SpanKind } from "@opentelemetry/api";
import * as assert from "assert";
import * as sinon from "sinon";
import { PerformanceCounterMetricsHandler } from "../../../src/metrics/handlers";
import { NativeMetricsCounter, PerformanceCounter } from "../../../src/metrics/types";
import { ApplicationInsightsConfig } from "../../../src/shared";
import { ExportResultCode } from "@opentelemetry/core";

describe("PerformanceCounterMetricsHandler", () => {
    let autoCollect: PerformanceCounterMetricsHandler;
    let config: ApplicationInsightsConfig;
    let exportStub: sinon.SinonStub;

    before(() => {
        config = new ApplicationInsightsConfig();
        config.azureMonitorExporterConfig.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
        config.extendedMetrics.heap = true;
        config.extendedMetrics.loop = true;
        config.extendedMetrics.gc = true;
    });

    afterEach(() => {
        exportStub.resetHistory();
        autoCollect.shutdown();
    });

    after(() => {
        exportStub.restore();
    });

    function createAutoCollect(customConfig?: ApplicationInsightsConfig) {
        autoCollect = new PerformanceCounterMetricsHandler(customConfig || config, { collectionInterval: 100 });
        exportStub = sinon.stub(autoCollect["_azureExporter"], "export").callsFake(
            (spans: any, resultCallback: any) =>
                new Promise((resolve, reject) => {
                    resultCallback({
                        code: ExportResultCode.SUCCESS,
                    });
                    resolve();
                })
        );
    }

    describe("#Metrics", () => {
        it("should create instruments", () => {
            createAutoCollect();
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
            createAutoCollect();
            await new Promise((resolve) => setTimeout(resolve, 120));
            assert.ok(exportStub.called);
            const resourceMetrics = exportStub.args[0][0];
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
            createAutoCollect();
            autoCollect.shutdown();
            await new Promise((resolve) => setTimeout(resolve, 120));
            assert.ok(exportStub.notCalled);
        });

        it("should add correct views", () => {
            const config = new ApplicationInsightsConfig();
            config.azureMonitorExporterConfig.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
            config.extendedMetrics.heap = false;
            config.extendedMetrics.loop = false;
            config.extendedMetrics.gc = false;
            createAutoCollect(config);
            let views = autoCollect["_getViews"]();
            assert.equal(views.length, 11);
        });
    });
});
