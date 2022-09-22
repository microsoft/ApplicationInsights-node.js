import { SpanKind } from "@opentelemetry/api";
import * as assert from "assert";
import * as sinon from "sinon";

import { CustomMetricsHandler } from "../../../src/autoCollection/metrics/handlers/customMetricsHandler";
import { Config } from "../../../src/library/configuration";


describe("#LiveMetricsHandler", () => {
    var sandbox: sinon.SinonSandbox;
    let autoCollect: CustomMetricsHandler;

    before(() => {
        sandbox = sinon.createSandbox();
        let config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        autoCollect = new CustomMetricsHandler(config, { collectionInterval: 100 });
        sandbox.stub(autoCollect["_metricReader"]["_exporter"], "export");
    });

    afterEach(() => {
        sandbox.restore();
    });

    after(() => {
        autoCollect.shutdown();
    });

    it("should create a meter", () => {
        assert.ok(autoCollect.getMeter(), "meter not available");
    });

    it("should observe instruments during collection", async () => {
        let mockExport = sandbox.stub(autoCollect["_azureExporter"], "export");
        autoCollect.getMeter().createCounter("testCounter", { description: "testDescription" });
        await new Promise(resolve => setTimeout(resolve, 120));
        assert.ok(mockExport.called);
        let resourceMetrics = mockExport.args[0][0];
        const scopeMetrics = resourceMetrics.scopeMetrics;
        assert.strictEqual(scopeMetrics.length, 1, 'scopeMetrics count');
        let metrics = scopeMetrics[0].metrics;
        assert.strictEqual(metrics.length, 1, 'metrics count');
        assert.equal(metrics[0].descriptor.name,"testCounter");
        assert.equal(metrics[0].descriptor.description,"testDescription");
    });

    it("should not collect when disabled", async () => {
        let mockExport = sandbox.stub(autoCollect["_azureExporter"], "export");
        autoCollect.getMeter().createCounter("testCounter", { description: "testDescription" });
        autoCollect.shutdown();
        await new Promise(resolve => setTimeout(resolve, 120));
        assert.ok(mockExport.notCalled);
    });
});