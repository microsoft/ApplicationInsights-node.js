import { SpanKind } from "@opentelemetry/api";
import * as assert from "assert";
import * as sinon from "sinon";

import { LiveMetricsHandler } from "../../../src/autoCollection/metrics/handlers/liveMetricsHandler";
import { IMetricExceptionDimensions, QuickPulseCounter, StandardMetric } from "../../../src/autoCollection/metrics/types";
import { Config } from "../../../src/library/configuration";


describe("#LiveMetricsHandler", () => {
    var sandbox: sinon.SinonSandbox;
    let autoCollect: LiveMetricsHandler;

    before(() => {
        sandbox = sinon.createSandbox();
        let config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        autoCollect = new LiveMetricsHandler(config, { collectionInterval: 100 });
        sandbox.stub(autoCollect["_metricReader"]["_exporter"], "export");
    });

    afterEach(() => {
        sandbox.restore();
    });

    after(() => {
        autoCollect.shutdown();
    });

    it("should create instruments", () => {
        assert.ok(autoCollect.getExceptionMetrics()["_exceptionsRateGauge"], "_exceptionsRateGauge not available");
        assert.ok(autoCollect.getRequestMetrics()["_requestRateGauge"], "_requestRateGauge not available");
        assert.ok(autoCollect.getRequestMetrics()["_requestFailureRateGauge"], "_requestFailureRateGauge not available");
        assert.ok(autoCollect.getDependencyMetrics()["_dependencyRateGauge"], "_dependencyRateGauge not available");
        assert.ok(autoCollect.getDependencyMetrics()["_dependencyFailureRateGauge"], "_dependencyFailureRateGauge not available");
        assert.ok(autoCollect.getHttpMetricsInstrumentation()["_httpServerDurationHistogram"], "_httpServerDurationHistogram not available");
        assert.ok(autoCollect.getHttpMetricsInstrumentation()["_httpClientDurationHistogram"], "_httpClientDurationHistogram not available");
        assert.ok(autoCollect.getProcessMetrics()["_memoryCommittedBytesGauge"], "_memoryCommittedBytesGauge not available");
        assert.ok(autoCollect.getProcessMetrics()["_processorTimeGauge"], "_processorTimeGauge not available");
    });

    it("should observe instruments during collection", async () => {
        let mockExport = sandbox.stub(autoCollect["_azureExporter"], "export");
        autoCollect.start();
        let dimensions: IMetricExceptionDimensions = {
            cloudRoleInstance: "testcloudRoleInstance",
            cloudRoleName: "testcloudRoleName"
        };
        autoCollect.getExceptionMetrics().countException(dimensions);
        autoCollect.getHttpMetricsInstrumentation().setMeterProvider(autoCollect["_meterProvider"]);
        autoCollect.getHttpMetricsInstrumentation()["_httpRequestDone"]({
            startTime: Date.now() - 100,
            isProcessed: false,
            spanKind: SpanKind.CLIENT,
            attributes: { "HTTP_STATUS_CODE": "200" }
        });
        autoCollect.getHttpMetricsInstrumentation()["_httpRequestDone"]({
            startTime: Date.now() - 100,
            isProcessed: false,
            spanKind: SpanKind.SERVER,
            attributes: { "HTTP_STATUS_CODE": "200" }
        });

        await new Promise(resolve => setTimeout(resolve, 120));
        assert.ok(mockExport.called);
        let resourceMetrics = mockExport.args[0][0];
        const scopeMetrics = resourceMetrics.scopeMetrics;
        assert.strictEqual(scopeMetrics.length, 2, 'scopeMetrics count');
        let metrics = scopeMetrics[0].metrics;
        assert.strictEqual(metrics.length, 7, 'metrics count');
        assert.equal(metrics[0].descriptor.name, QuickPulseCounter.PROCESSOR_TIME);
        assert.equal(metrics[1].descriptor.name, QuickPulseCounter.COMMITTED_BYTES);
        assert.equal(metrics[2].descriptor.name, QuickPulseCounter.EXCEPTION_RATE);
        assert.equal(metrics[3].descriptor.name, QuickPulseCounter.REQUEST_RATE);
        assert.equal(metrics[4].descriptor.name, QuickPulseCounter.REQUEST_FAILURE_RATE);
        assert.equal(metrics[5].descriptor.name, QuickPulseCounter.DEPENDENCY_RATE);
        assert.equal(metrics[6].descriptor.name, QuickPulseCounter.DEPENDENCY_FAILURE_RATE);
        metrics = scopeMetrics[1].metrics;
        assert.strictEqual(metrics.length, 2, 'metrics count');
        assert.equal(metrics[0].descriptor.name, QuickPulseCounter.REQUEST_DURATION);
        assert.equal(metrics[1].descriptor.name, QuickPulseCounter.DEPENDENCY_DURATION);
    });

    it("should not collect when disabled", async () => {
        let mockExport = sandbox.stub(autoCollect["_azureExporter"], "export");
        autoCollect.start();
        autoCollect.shutdown();
        await new Promise(resolve => setTimeout(resolve, 120));
        assert.ok(mockExport.notCalled);
    });
});