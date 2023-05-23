import * as assert from "assert";
import * as sinon from "sinon";

import { CustomMetricsHandler } from "../../../src/metrics/handlers/customMetricsHandler";
import { ApplicationInsightsConfig } from "../../../src/shared";
import { ExportResultCode } from "@opentelemetry/core";

describe("#CustomMetricsHandler", () => {
    let autoCollect: CustomMetricsHandler;
    let exportStub: sinon.SinonStub;
    let otlpExportStub: sinon.SinonStub;

    before(() => {
        const config = new ApplicationInsightsConfig();
        config.azureMonitorExporterConfig.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
        config.otlpMetricExporterConfig.enabled = true;
        autoCollect = new CustomMetricsHandler(config, { collectionInterval: 100 });
        exportStub = sinon.stub(autoCollect["_azureMonitorExporter"], "export").callsFake(
            (spans: any, resultCallback: any) =>
                new Promise((resolve, reject) => {
                    resultCallback({
                        code: ExportResultCode.SUCCESS,
                    });
                    resolve();
                })
        );
        otlpExportStub = sinon.stub(autoCollect["_otlpExporter"], "export").callsFake(
            (spans: any, resultCallback: any) =>
                new Promise((resolve, reject) => {
                    resultCallback({
                        code: ExportResultCode.SUCCESS,
                    });
                    resolve(null);
                })
        );
    });

    afterEach(() => {
        exportStub.resetHistory();
        otlpExportStub.resetHistory();
    });

    after(() => {
        autoCollect.shutdown();
        exportStub.restore();
        otlpExportStub.restore();
    });

    it("should create a meter", () => {
        assert.ok(autoCollect.getMeter(), "meter not available");
    });

    it("should observe instruments during collection", async () => {
        autoCollect.getMeter().createCounter("testCounter", { description: "testDescription" });
        await new Promise((resolve) => setTimeout(resolve, 120));
        assert.ok(exportStub.called);
        const resourceMetrics = exportStub.args[0][0];
        const scopeMetrics = resourceMetrics.scopeMetrics;
        assert.strictEqual(scopeMetrics.length, 1, "scopeMetrics count");
        const metrics = scopeMetrics[0].metrics;
        assert.strictEqual(metrics.length, 1, "metrics count");
        assert.equal(metrics[0].descriptor.name, "testCounter");
        assert.equal(metrics[0].descriptor.description, "testDescription");

        assert.ok(otlpExportStub.called);
        assert.strictEqual(otlpExportStub.args[0][0].scopeMetrics.length, 1, "scopeMetrics count");
        assert.strictEqual(otlpExportStub.args[0][0].scopeMetrics[0].metrics.length, 1, "metrics count");
    });

    it("should not collect when disabled", async () => {
        autoCollect.getMeter().createCounter("testCounter", { description: "testDescription" });
        autoCollect.shutdown();
        await new Promise((resolve) => setTimeout(resolve, 120));
        assert.ok(exportStub.notCalled);
    });
});
