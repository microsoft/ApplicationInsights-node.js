import * as assert from "assert";
import * as sinon from "sinon";
import { MetricHandler } from "../../../src/metrics";
import { ApplicationInsightsConfig } from "../../../src/shared";

describe("Library/MetricHandler", () => {
    let sandbox: sinon.SinonSandbox;
    let _config: ApplicationInsightsConfig;

    before(() => {
        _config = new ApplicationInsightsConfig();
        _config.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#autoCollect", () => {
        it("performance enablement during start", () => {
            _config.enableAutoCollectPerformance = true;
            const handler = new MetricHandler(_config);
            assert.ok(handler["_perfCounterMetricsHandler"], "Performance counters not loaded");
        });

        it("preAggregated metrics enablement during start", () => {
            _config.enableAutoCollectStandardMetrics = true;
            const handler = new MetricHandler(_config);
            assert.ok(handler["_standardMetricsHandler"], "preAggregated metrics not loaded");
        });

        it("heartbeat metrics enablement during start", () => {
            _config.enableAutoCollectHeartbeat = true;
            const handler = new MetricHandler(_config);
            assert.ok(handler["_standardMetricsHandler"], "Heartbeat metrics not loaded");
        });
    });
});
