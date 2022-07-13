import * as assert from "assert";
import * as sinon from "sinon";
import { ExportResultCode } from "@opentelemetry/core";

import { MetricHandler, ResourceManager } from "../../../src/library/handlers";
import { Config } from "../../../src/library/configuration";
import { MetricTelemetry, MetricPointTelemetry } from "../../../src/declarations/contracts";



describe("Library/LogHandler", () => {
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
            let stub = sinon.stub(handler["_performance"], "enable");
            handler.start();
            assert.ok(stub.calledOnce, "Enable called");
            assert.equal(stub.args[0][0], true);
        });

        it("setAutoCollectPerformance", () => {
            _config.enableAutoCollectPerformance = false;
            let handler = new MetricHandler(_config);
            let stub = sinon.stub(handler["_performance"], "enable");
            let nativeStub = sinon.stub(handler["_nativePerformance"], "enable");
            handler.start();
            assert.ok(stub.called, "Enable was not called");
            assert.equal(stub.args[0][0], false);
            assert.equal(nativeStub.args[0][0], false);
            handler.setAutoCollectPerformance(true, true);
            assert.ok(stub.called, "Enable was not called");
            assert.equal(stub.args[1][0], true);
            assert.equal(nativeStub.args[1][0], true);
        });


        it("preAggregated metrics enablement during start", () => {
            _config.enableAutoCollectPreAggregatedMetrics = true;
            let handler = new MetricHandler(_config);
            let stub = sinon.stub(handler["_preAggregatedMetrics"], "enable");
            handler.start();
            assert.ok(stub.calledOnce, "Enable called");
            assert.equal(stub.args[0][0], true);
        });

        it("setAutoCollectPreAggregatedMetrics", () => {
            _config.enableAutoCollectPreAggregatedMetrics = false;
            let handler = new MetricHandler(_config);
            let stub = sinon.stub(handler["_preAggregatedMetrics"], "enable");
            handler.start();
            assert.ok(stub.called, "Enable was not called");
            assert.equal(stub.args[0][0], false);
            handler.setAutoCollectPreAggregatedMetrics(true);
            assert.ok(stub.called, "Enable was not called");
            assert.equal(stub.args[1][0], true);
        });

        it("preAggregated metrics enablement during start", () => {
            _config.enableAutoCollectHeartbeat = true;
            let handler = new MetricHandler(_config);
            let stub = sinon.stub(handler["_preAggregatedMetrics"], "enable");
            handler.start();
            assert.ok(stub.calledOnce, "Enable called");
            assert.equal(stub.args[0][0], true);
        });

        it("setAutoCollectHeartbeat", () => {
            _config.enableAutoCollectHeartbeat = false;
            let handler = new MetricHandler(_config);
            let stub = sinon.stub(handler["_heartbeat"], "enable");
            handler.start();
            assert.ok(stub.called, "Enable was not called");
            assert.equal(stub.args[0][0], false);
            handler.setAutoCollectHeartbeat(true);
            assert.ok(stub.called, "Enable was not called");
            assert.equal(stub.args[1][0], true);
        });
    });


    describe("#manual track APIs", () => {
        it("trackMetric", (done) => {
            let handler = new MetricHandler(_config)
            let stub = sinon.stub(handler["_exporter"], "export").callsFake((envelopes: any, resultCallback: any) => {
                return new Promise((resolve, reject) => {
                    resultCallback({
                        code: ExportResultCode.SUCCESS
                    });
                    resolve();
                });
            });
            let metrics: MetricPointTelemetry[] = [
                {
                    name: "testName",
                    value: 0,
                    namespace: "testNamespace",
                    kind: "Measurement",
                    count: 1,
                    min: 2,
                    max: 3,
                    stdDev: 4,
                }
            ];
            let properties: { [key: string]: number } = {};
            properties["test"] = 123;
            let telemetry: MetricTelemetry = {
                metrics: metrics,
                properties: properties,
            };
            handler.trackMetric(telemetry);
            handler.flush().then(() => {
                assert.ok(stub.calledOnce, "Export called");
                let envelopes = stub.args[0][0] as any;
                assert.equal(envelopes.length, 1);
                assert.equal(envelopes[0].name, "Microsoft.ApplicationInsights.1aa11111bbbb1ccc8dddeeeeffff3333.Metric");
                assert.equal(envelopes[0].version, "1");
                assert.equal(envelopes[0].instrumentationKey, "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert.equal(envelopes[0].sampleRate, "100");
                assert.ok(envelopes[0].time);
                assert.equal(envelopes[0].data.baseType, "MetricData");
                assert.equal(envelopes[0].data.baseData["metrics"].length, 1);
                assert.equal(envelopes[0].data.baseData["metrics"][0]["name"], "testName");
                assert.equal(envelopes[0].data.baseData["metrics"][0]["namespace"], "testNamespace");
                assert.equal(envelopes[0].data.baseData["metrics"][0]["dataPointType"], "Measurement");
                assert.equal(envelopes[0].data.baseData["metrics"][0]["value"], 0);
                assert.equal(envelopes[0].data.baseData["metrics"][0]["count"], 1);
                assert.equal(envelopes[0].data.baseData["metrics"][0]["min"], 2);
                assert.equal(envelopes[0].data.baseData["metrics"][0]["max"], 3);
                assert.equal(envelopes[0].data.baseData["metrics"][0]["stdDev"], 4);
                assert.equal(envelopes[0].data.baseData["properties"]["test"], "123");
                assert.equal(envelopes[0].data.baseData["version"], "2");
                done();
            }).catch((error) => {
                done(error);
            });;
        });

        it("trackStatsbeatMetric", (done) => {
            let handler = new MetricHandler(_config)
            let stub = sinon.stub(handler["_exporter"], "export").callsFake((envelopes: any, resultCallback: any) => {
                return new Promise((resolve, reject) => {
                    resultCallback({
                        code: ExportResultCode.SUCCESS
                    });
                    resolve();
                });
            });
            let metrics: MetricPointTelemetry[] = [
                {
                    name: "testName",
                    value: 0,
                    namespace: "testNamespace",
                    kind: "Measurement",
                    count: 1,
                    min: 2,
                    max: 3,
                    stdDev: 4,
                }
            ];
            let properties: { [key: string]: number } = {};
            properties["test"] = 123;
            let telemetry: MetricTelemetry = {
                metrics: metrics,
                properties: properties,
            };
            handler.trackStatsbeatMetric(telemetry);
            handler.flush().then(() => {
                assert.ok(stub.calledOnce, "Export called");
                let envelopes = stub.args[0][0] as any;
                assert.equal(envelopes.length, 1);
                assert.equal(envelopes[0].name, "Statsbeat");
                assert.equal(envelopes[0].version, "1");
                assert.equal(envelopes[0].instrumentationKey, "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
                assert.equal(envelopes[0].sampleRate, "100");
                assert.ok(envelopes[0].time);
                assert.equal(envelopes[0].data.baseType, "MetricData");
                assert.equal(envelopes[0].data.baseData["metrics"].length, 1);
                assert.equal(envelopes[0].data.baseData["metrics"][0]["name"], "testName");
                assert.equal(envelopes[0].data.baseData["metrics"][0]["namespace"], "testNamespace");
                assert.equal(envelopes[0].data.baseData["metrics"][0]["dataPointType"], "Measurement");
                assert.equal(envelopes[0].data.baseData["metrics"][0]["value"], 0);
                assert.equal(envelopes[0].data.baseData["metrics"][0]["count"], 1);
                assert.equal(envelopes[0].data.baseData["metrics"][0]["min"], 2);
                assert.equal(envelopes[0].data.baseData["metrics"][0]["max"], 3);
                assert.equal(envelopes[0].data.baseData["metrics"][0]["stdDev"], 4);
                assert.equal(envelopes[0].data.baseData["properties"]["test"], "123");
                assert.equal(envelopes[0].data.baseData["version"], "2");
                done();
            }).catch((error) => {
                done(error);
            });;
        });
    });
});
