import * as assert from "assert";
import * as sinon from "sinon";
import { MetricHandler } from "../../../src/metrics";
import { ApplicationInsightsConfig } from "../../../src/shared";
import { ExportResultCode } from "@opentelemetry/core";

describe("Library/MetricHandler", () => {
    let exportStub: sinon.SinonStub;
    let _config: ApplicationInsightsConfig;
    let handler: MetricHandler;

    before(() => {
        _config = new ApplicationInsightsConfig();
        _config.azureMonitorExporterConfig.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
    });

    afterEach(() => {
        exportStub.resetHistory();
        handler.shutdown();
    });

    after(() => {
        exportStub.restore();
    });

    describe("#autoCollect", () => {
        it("performance enablement during start", () => {
            _config.enableAutoCollectPerformance = true;
            handler = new MetricHandler(_config);
            exportStub = sinon.stub(handler["_perfCounterMetricsHandler"]["_azureExporter"], "export").callsFake(
                (spans: any, resultCallback: any) =>
                    new Promise((resolve, reject) => {
                        resultCallback({
                            code: ExportResultCode.SUCCESS,
                        });
                        resolve();
                    })
            );
            assert.ok(handler["_perfCounterMetricsHandler"], "Performance counters not loaded");
        });

        it("preAggregated metrics enablement during start", () => {
            _config.enableAutoCollectStandardMetrics = true;
            handler = new MetricHandler(_config);
            exportStub = sinon.stub(handler["_standardMetricsHandler"]["_azureExporter"], "export").callsFake(
                (spans: any, resultCallback: any) =>
                    new Promise((resolve, reject) => {
                        resultCallback({
                            code: ExportResultCode.SUCCESS,
                        });
                        resolve();
                    })
            );
            assert.ok(handler["_standardMetricsHandler"], "preAggregated metrics not loaded");
        });

        it("heartbeat metrics enablement during start", () => {
            _config.enableAutoCollectHeartbeat = true;
            handler = new MetricHandler(_config);
            exportStub = sinon.stub(handler["_heartbeatHandler"]["_azureExporter"], "export").callsFake(
                (spans: any, resultCallback: any) =>
                    new Promise((resolve, reject) => {
                        resultCallback({
                            code: ExportResultCode.SUCCESS,
                        });
                        resolve();
                    })
            );
            assert.ok(handler["_heartbeatHandler"], "Heartbeat metrics not loaded");
        });
    });
});
