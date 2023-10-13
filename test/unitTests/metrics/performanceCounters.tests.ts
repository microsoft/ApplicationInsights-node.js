// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as assert from "assert";
import * as sinon from "sinon";
import { Attributes, SpanKind } from "@opentelemetry/api";
import { ExportResultCode } from "@opentelemetry/core";
import { PerformanceCounterMetrics } from "../../../src/metrics/performanceCounters";
import { ApplicationInsightsConfig } from "../../../src/shared/configuration/config";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { Resource } from "@opentelemetry/resources";
import { Histogram } from "@opentelemetry/sdk-metrics";


describe("PerformanceCounterMetricsHandler", () => {
  let autoCollect: PerformanceCounterMetrics;
  let config: ApplicationInsightsConfig;
  let exportStub: sinon.SinonStub;

  before(() => {
    config = new ApplicationInsightsConfig();
    config.azureMonitorExporterOptions.connectionString =
      "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
    autoCollect = new PerformanceCounterMetrics(config || config, {
      collectionInterval: 100,
    });
    exportStub = sinon.stub(autoCollect["_azureExporter"], "export").callsFake(
      (spans: any, resultCallback: any) =>
        new Promise((resolve) => {
          resultCallback({
            code: ExportResultCode.SUCCESS,
          });
          resolve(spans);
        })
    );
  });

  afterEach(() => {
    exportStub.resetHistory();
  });

  after(async () => {
    exportStub.restore();
    await autoCollect.shutdown();
  });


  describe("#Metrics", () => {
    it("should observe instruments during collection", async () => {
      let resource = new Resource({});
      resource.attributes[SemanticResourceAttributes.SERVICE_NAME] = "testcloudRoleName";
      resource.attributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID] = "testcloudRoleInstance";
      let serverSpan: any = {
        kind: SpanKind.SERVER,
        duration: [654321],
        attributes: {
          "http.status_code": 200,
        },
        resource: resource,
      };

      for (let i = 0; i < 10; i++) {
        autoCollect.recordSpan(serverSpan);
      }

      await new Promise((resolve) => setTimeout(resolve, 120));
      assert.ok(exportStub.called);
      const resourceMetrics = exportStub.args[0][0];
      const scopeMetrics = resourceMetrics.scopeMetrics;
      assert.strictEqual(scopeMetrics.length, 1, "scopeMetrics count");
      let metrics = scopeMetrics[0].metrics;
      assert.strictEqual(metrics.length, 6, "metrics count");

      assert.deepStrictEqual(
        metrics[0].descriptor.name,
        "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Request Execution Time"
      );
      assert.strictEqual(metrics[0].dataPoints.length, 1, "dataPoints count");
      assert.strictEqual((metrics[0].dataPoints[0].value as Histogram).count, 10, "dataPoint count");
      assert.strictEqual((metrics[0].dataPoints[0].value as Histogram).min, 654321, "dataPoint min");
      assert.strictEqual((metrics[0].dataPoints[0].value as Histogram).max, 654321, "dataPoint max");
      assert.strictEqual((metrics[0].dataPoints[0].value as Histogram).sum, 6543210, "dataPoint sum");
      
      assert.deepStrictEqual(
        metrics[1].descriptor.name,
        "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Requests/Sec"
      );
      assert.ok(metrics[1].dataPoints[0].value> 0, "Wrong request rate value");

      assert.deepStrictEqual(
        metrics[2].descriptor.name,
        "\\Process(??APP_WIN32_PROC??)\\Private Bytes"
      );
      assert.ok(metrics[2].dataPoints[0].value > 0, "Wrong private bytes value");
      assert.deepStrictEqual(metrics[3].descriptor.name, "\\Memory\\Available Bytes");
      assert.ok(metrics[3].dataPoints[0].value > 0, "Wrong available bytes value");
      assert.deepStrictEqual(metrics[4].descriptor.name, "\\Processor(_Total)\\% Processor Time");
      assert.ok(
        metrics[4].dataPoints[0].value >= 0 && metrics[4].dataPoints[0].value <= 100,
        `Wrong Processor Time value: ${metrics[4].dataPoints[0].value}`
      );
      assert.deepStrictEqual(
        metrics[5].descriptor.name,
        "\\Process(??APP_WIN32_PROC??)\\% Processor Time"
      );
      assert.ok(
        metrics[5].dataPoints[0].value >= 0 && metrics[5].dataPoints[0].value <= 100,
        `Wrong Process Time value: ${metrics[5].dataPoints[0].value}`
      );
    });

    it("should not collect when disabled", async () => {
      autoCollect.shutdown();
      await new Promise((resolve) => setTimeout(resolve, 120));
      assert.ok(exportStub.notCalled);
    });
  });
});