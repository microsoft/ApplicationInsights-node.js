import { SpanKind } from "@opentelemetry/api";
import { Histogram } from "@opentelemetry/sdk-metrics";
import { SemanticAttributes, SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import * as assert from "assert";
import * as sinon from "sinon";

import { StandardMetricsHandler } from "../../../src/metrics/handlers/standardMetricsHandler";
import { IStandardMetricBaseDimensions, StandardMetric } from "../../../src/metrics/types";
import { ApplicationInsightsConfig } from "../../../src/shared";
import { ExportResultCode } from "@opentelemetry/core";

describe("#StandardMetricsHandler", () => {
    let exportStub: sinon.SinonStub;
    let otlpExportStub: sinon.SinonStub;
    let autoCollect: StandardMetricsHandler;

    before(() => {
        const config = new ApplicationInsightsConfig();
        config.azureMonitorExporterConfig.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
        config.otlpMetricExporterConfig.enabled = true;
        autoCollect = new StandardMetricsHandler(config, { collectionInterval: 100 });
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
        exportStub.restore();
        otlpExportStub.restore();
        autoCollect.shutdown();
    });

    it("should create instruments", () => {
        assert.ok(
            autoCollect["_exceptionMetrics"]["_exceptionsRateGauge"],
            "_exceptionsRateGauge not available"
        );
        assert.ok(
            autoCollect["_traceMetrics"]["_tracesRateGauge"],
            "_tracesRateGauge not available"
        );
    });

    it("should observe instruments during collection", async () => {
        let resource = {
            attributes: {} as any
        };

        let dimensions: IStandardMetricBaseDimensions = {
            cloudRoleInstance: "testcloudRoleInstance",
            cloudRoleName: "testcloudRoleName",
        };
        autoCollect.recordException(dimensions);
        autoCollect.recordTrace(dimensions);

        resource.attributes[SemanticResourceAttributes.SERVICE_NAME] = dimensions.cloudRoleName;
        resource.attributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID] = dimensions.cloudRoleInstance;

        let clientSpan: any = {
            kind: SpanKind.CLIENT,
            duration: [123456],
            attributes: {
                "http.status_code": 200,
            },
            resource: resource
        };
        clientSpan.attributes[SemanticAttributes.PEER_SERVICE] = "testPeerService";
        autoCollect.recordSpan(clientSpan);
        clientSpan.attributes["http.status_code"] = "400";
        autoCollect.recordSpan(clientSpan);

        let serverSpan: any = {
            kind: SpanKind.SERVER,
            duration: [654321],
            attributes: {
                "http.status_code": 200
            },
            resource: resource
        };
        autoCollect.recordSpan(serverSpan);
        serverSpan.attributes["http.status_code"] = "400";
        autoCollect.recordSpan(serverSpan);


        dimensions = {
            cloudRoleInstance: "testcloudRoleInstance2",
            cloudRoleName: "testcloudRoleName2",
        };
        resource.attributes[SemanticResourceAttributes.SERVICE_NAME] = dimensions.cloudRoleName;
        resource.attributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID] = dimensions.cloudRoleInstance;

        for (let i = 0; i < 10; i++) {
            autoCollect.recordException(dimensions);
            autoCollect.recordTrace(dimensions);
            clientSpan.duration[0] = i * 100000;
            autoCollect.recordSpan(clientSpan);
            serverSpan.duration[0] = i * 100000;
            autoCollect.recordSpan(serverSpan);
        }

        await new Promise((resolve) => setTimeout(resolve, 120));

        assert.ok(exportStub.called);
        const resourceMetrics = exportStub.args[0][0];
        const scopeMetrics = resourceMetrics.scopeMetrics;
        assert.strictEqual(scopeMetrics.length, 1, "scopeMetrics count");
        const metrics = scopeMetrics[0].metrics;
        assert.strictEqual(metrics.length, 4, "metrics count");
        assert.equal(metrics[0].descriptor.name, StandardMetric.HTTP_REQUEST_DURATION);
        assert.equal(metrics[1].descriptor.name, StandardMetric.HTTP_DEPENDENCY_DURATION);
        assert.equal(metrics[2].descriptor.name, StandardMetric.EXCEPTION_COUNT);
        assert.equal(metrics[3].descriptor.name, StandardMetric.TRACE_COUNT);

        // Requests

        assert.strictEqual(metrics[0].dataPoints.length, 3, "dataPoints count");
        assert.strictEqual((metrics[0].dataPoints[0].value as Histogram).count, 1, "dataPoint count");
        assert.strictEqual((metrics[0].dataPoints[0].value as Histogram).min, 654321, "dataPoint min");
        assert.strictEqual((metrics[0].dataPoints[0].value as Histogram).max, 654321, "dataPoint max");
        assert.strictEqual((metrics[0].dataPoints[0].value as Histogram).sum, 654321, "dataPoint sum");
        assert.strictEqual(metrics[0].dataPoints[0].attributes["cloudRoleInstance"], "testcloudRoleInstance");
        assert.strictEqual(metrics[0].dataPoints[0].attributes["cloudRoleName"], "testcloudRoleName");
        assert.strictEqual(metrics[0].dataPoints[0].attributes["IsAutocollected"], "True");
        assert.strictEqual(metrics[0].dataPoints[0].attributes["metricId"], "requests/duration");
        assert.strictEqual(metrics[0].dataPoints[0].attributes["requestResultCode"], "200");
        assert.strictEqual(metrics[0].dataPoints[0].attributes["requestSuccess"], "True");

        assert.strictEqual((metrics[0].dataPoints[1].value as Histogram).count, 1, "dataPoint count");
        assert.strictEqual((metrics[0].dataPoints[1].value as Histogram).min, 654321, "dataPoint min");
        assert.strictEqual((metrics[0].dataPoints[1].value as Histogram).max, 654321, "dataPoint max");
        assert.strictEqual((metrics[0].dataPoints[1].value as Histogram).sum, 654321, "dataPoint sum");
        assert.strictEqual(metrics[0].dataPoints[1].attributes["cloudRoleInstance"], "testcloudRoleInstance");
        assert.strictEqual(metrics[0].dataPoints[1].attributes["cloudRoleName"], "testcloudRoleName");
        assert.strictEqual(metrics[0].dataPoints[1].attributes["IsAutocollected"], "True");
        assert.strictEqual(metrics[0].dataPoints[1].attributes["metricId"], "requests/duration");
        assert.strictEqual(metrics[0].dataPoints[1].attributes["requestResultCode"], "400");
        assert.strictEqual(metrics[0].dataPoints[1].attributes["requestSuccess"], "False");

        assert.strictEqual((metrics[0].dataPoints[2].value as Histogram).count, 10, "dataPoint count");
        assert.strictEqual((metrics[0].dataPoints[2].value as Histogram).min, 0, "dataPoint min");
        assert.strictEqual((metrics[0].dataPoints[2].value as Histogram).max, 900000, "dataPoint max");
        assert.strictEqual((metrics[0].dataPoints[2].value as Histogram).sum, 4500000, "dataPoint sum");
        assert.strictEqual(metrics[0].dataPoints[2].attributes["cloudRoleInstance"], "testcloudRoleInstance2");
        assert.strictEqual(metrics[0].dataPoints[2].attributes["cloudRoleName"], "testcloudRoleName2");
        assert.strictEqual(metrics[0].dataPoints[2].attributes["IsAutocollected"], "True");
        assert.strictEqual(metrics[0].dataPoints[2].attributes["metricId"], "requests/duration");
        assert.strictEqual(metrics[0].dataPoints[2].attributes["requestResultCode"], "400");
        assert.strictEqual(metrics[0].dataPoints[2].attributes["requestSuccess"], "False");

        // Dependencies
        assert.strictEqual(metrics[1].dataPoints.length, 3, "dataPoints count");
        assert.strictEqual((metrics[1].dataPoints[0].value as Histogram).count, 1, "dataPoint count");
        assert.strictEqual((metrics[1].dataPoints[0].value as Histogram).min, 123456, "dataPoint min");
        assert.strictEqual((metrics[1].dataPoints[0].value as Histogram).max, 123456, "dataPoint max");
        assert.strictEqual((metrics[1].dataPoints[0].value as Histogram).sum, 123456, "dataPoint sum");
        assert.strictEqual(metrics[1].dataPoints[0].attributes["metricId"], "dependencies/duration");
        assert.strictEqual(metrics[1].dataPoints[0].attributes["dependencyTarget"], "testPeerService");
        assert.strictEqual(metrics[1].dataPoints[0].attributes["dependencyResultCode"], "200");
        assert.strictEqual(metrics[1].dataPoints[0].attributes["dependencyType"], "http");
        assert.strictEqual(metrics[1].dataPoints[0].attributes["dependencySuccess"], "True");

        assert.strictEqual((metrics[1].dataPoints[1].value as Histogram).count, 1, "dataPoint count");
        assert.strictEqual((metrics[1].dataPoints[1].value as Histogram).min, 123456, "dataPoint min");
        assert.strictEqual((metrics[1].dataPoints[1].value as Histogram).max, 123456, "dataPoint max");
        assert.strictEqual((metrics[1].dataPoints[1].value as Histogram).sum, 123456, "dataPoint sum");
        assert.strictEqual(metrics[1].dataPoints[1].attributes["metricId"], "dependencies/duration");
        assert.strictEqual(metrics[1].dataPoints[1].attributes["dependencyTarget"], "testPeerService");
        assert.strictEqual(metrics[1].dataPoints[1].attributes["dependencyResultCode"], "400");
        assert.strictEqual(metrics[1].dataPoints[1].attributes["dependencyType"], "http");
        assert.strictEqual(metrics[1].dataPoints[1].attributes["dependencySuccess"], "False");

        assert.strictEqual((metrics[1].dataPoints[2].value as Histogram).count, 10, "dataPoint count");
        assert.strictEqual((metrics[1].dataPoints[2].value as Histogram).min, 0, "dataPoint min");
        assert.strictEqual((metrics[1].dataPoints[2].value as Histogram).max, 900000, "dataPoint max");
        assert.strictEqual((metrics[1].dataPoints[2].value as Histogram).sum, 4500000, "dataPoint sum");
        assert.strictEqual(metrics[1].dataPoints[2].attributes["metricId"], "dependencies/duration");
        assert.strictEqual(metrics[1].dataPoints[2].attributes["dependencyTarget"], "testPeerService");
        assert.strictEqual(metrics[1].dataPoints[2].attributes["dependencyResultCode"], "400");
        assert.strictEqual(metrics[1].dataPoints[2].attributes["dependencyType"], "http");
        assert.strictEqual(metrics[1].dataPoints[2].attributes["dependencySuccess"], "False");

        // Exceptions
        assert.strictEqual(metrics[2].dataPoints.length, 2, "dataPoints count");
        assert.strictEqual(metrics[2].dataPoints[0].value, 1, "dataPoint value");
        assert.strictEqual(
            metrics[2].dataPoints[0].attributes["cloudRoleInstance"],
            "testcloudRoleInstance"
        );
        assert.strictEqual(
            metrics[2].dataPoints[0].attributes["cloudRoleName"],
            "testcloudRoleName"
        );
        assert.strictEqual(metrics[2].dataPoints[1].value, 10, "dataPoint value");
        assert.strictEqual(
            metrics[2].dataPoints[1].attributes["cloudRoleInstance"],
            "testcloudRoleInstance2"
        );
        assert.strictEqual(
            metrics[2].dataPoints[1].attributes["cloudRoleName"],
            "testcloudRoleName2"
        );
        // Traces
        assert.strictEqual(metrics[3].dataPoints[0].value, 1, "dataPoint value");
        assert.strictEqual(
            metrics[3].dataPoints[0].attributes["cloudRoleInstance"],
            "testcloudRoleInstance"
        );
        assert.strictEqual(
            metrics[3].dataPoints[0].attributes["cloudRoleName"],
            "testcloudRoleName"
        );
        assert.strictEqual(metrics[3].dataPoints[1].value, 10, "dataPoint value");
        assert.strictEqual(
            metrics[3].dataPoints[1].attributes["cloudRoleInstance"],
            "testcloudRoleInstance2"
        );
        assert.strictEqual(
            metrics[3].dataPoints[1].attributes["cloudRoleName"],
            "testcloudRoleName2"
        );

        // OTLP export
        assert.ok(otlpExportStub.called);
        assert.strictEqual(otlpExportStub.args[0][0].scopeMetrics.length, 1, "scopeMetrics count");
        assert.strictEqual(otlpExportStub.args[0][0].scopeMetrics[0].metrics.length, 4, "metrics count");
    });

    it("should not collect when disabled", async () => {
        autoCollect.shutdown();
        await new Promise((resolve) => setTimeout(resolve, 120));
        assert.ok(exportStub.notCalled);
        assert.ok(otlpExportStub.notCalled);
    });
});
