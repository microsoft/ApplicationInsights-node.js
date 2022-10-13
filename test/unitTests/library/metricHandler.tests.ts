import * as assert from "assert";
import * as sinon from "sinon";
import { ExportResultCode } from "@opentelemetry/core";

import { MetricHandler } from "../../../src/library/handlers";
import { Config } from "../../../src/library/configuration";
import { MetricTelemetry, MetricPointTelemetry } from "../../../src/declarations/contracts";



describe("Library/MetricHandler", () => {
    let sandbox: sinon.SinonSandbox;
    let _config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");

    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#autoCollect", () => {
        it("performance enablement during start", () => {
            _config.enableAutoCollectPerformance = true;
            let handler = new MetricHandler(_config);
            handler["_perfCounterMetricsHandler"]["_nativeMetrics"]["_metricsAvailable"] = false;
            let stub = sinon.stub(handler["_perfCounterMetricsHandler"], "start");
            handler.start();
            assert.ok(stub.calledOnce, "Enable called");
        });


        it("preAggregated metrics enablement during start", () => {
            _config.enableAutoCollectPreAggregatedMetrics = true;
            let handler = new MetricHandler(_config);
            handler["_perfCounterMetricsHandler"]["_nativeMetrics"]["_metricsAvailable"] = false;
            let stub = sinon.stub(handler["_standardMetricsHandler"], "start");
            handler.start();
            assert.ok(stub.calledOnce, "start called");
        });

        it("heartbeat metrics enablement during start", () => {
            _config.enableAutoCollectHeartbeat = true;
            let handler = new MetricHandler(_config);
            handler["_perfCounterMetricsHandler"]["_nativeMetrics"]["_metricsAvailable"] = false;
            let stub = sinon.stub(handler["_heartbeatHandler"], "start");
            handler.start();
            assert.ok(stub.calledOnce, "start called");
        });
    });
});
