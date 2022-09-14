import { SpanKind } from "@opentelemetry/api";
import { InstrumentType } from "@opentelemetry/sdk-metrics";
import * as assert from "assert";
import * as sinon from "sinon";

import { StandardMetricsHandler } from "../../../src/autoCollection/metrics/handlers/standardMetricsHandler";
import { IMetricExceptionDimensions, StandardMetric } from "../../../src/autoCollection/metrics/types";
import { Config } from "../../../src/library/configuration";


describe("#StandardMetricsHandler", () => {
    var sandbox: sinon.SinonSandbox;
    let autoCollect: StandardMetricsHandler;

    before(() => {
        sandbox = sinon.createSandbox();
        let config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        autoCollect = new StandardMetricsHandler(config, { collectionInterval: 100 });
        sandbox.stub(autoCollect["_metricReader"]["_exporter"], "export");
    });

    afterEach(() => {
        sandbox.restore();
    });

    after(() => {
        autoCollect.shutdown();
    });

    it("should create instruments", () => {
        assert.ok(autoCollect.getExceptionMetrics()["_exceptionsGauge"], "_exceptionsGauge not available");
        assert.ok(autoCollect.getTraceMetrics()["_tracesGauge"], "_tracesGauge not available");
        assert.ok(autoCollect.getHttpMetricsInstrumentation()["_httpServerDurationHistogram"], "_httpServerDurationHistogram not available");
        assert.ok(autoCollect.getHttpMetricsInstrumentation()["_httpClientDurationHistogram"], "_httpClientDurationHistogram not available");
    });

    it("should observe instruments during collection", async () => {
        let mockExport = sandbox.stub(autoCollect["_azureExporter"], "export");
        autoCollect.start();
        let dimensions: IMetricExceptionDimensions = {
            cloudRoleInstance: "testcloudRoleInstance",
            cloudRoleName: "testcloudRoleName"
        };
        autoCollect.getExceptionMetrics().countException(dimensions);
        autoCollect.getTraceMetrics().countTrace(dimensions);
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
        assert.strictEqual(metrics.length, 2, 'metrics count');
        assert.equal(metrics[0].descriptor.name, StandardMetric.EXCEPTIONS);
        assert.equal(metrics[1].descriptor.name, StandardMetric.TRACES);
        metrics = scopeMetrics[1].metrics;
        assert.strictEqual(metrics.length, 2, 'metrics count');
        assert.equal(metrics[0].descriptor.name, StandardMetric.REQUESTS);
        assert.equal(metrics[1].descriptor.name, StandardMetric.DEPENDENCIES);
    });

    it("should not collect when disabled", async () => {
        let mockExport = sandbox.stub(autoCollect["_azureExporter"], "export");
        autoCollect.start();
        autoCollect.shutdown();
        await new Promise(resolve => setTimeout(resolve, 120));
        assert.ok(mockExport.notCalled);
    });
});