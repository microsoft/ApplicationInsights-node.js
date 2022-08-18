import { MetricData } from "@opentelemetry/sdk-metrics-base";
import * as assert from "assert";
import * as sinon from "sinon";

import { NativePerformanceMetrics, getNativeMetricsConfig } from "../../../src/autoCollection/metrics/nativePerformanceMetrics";
import { NativeMetricsCounter } from "../../../src/autoCollection/metrics/types";
import { Config, JsonConfig } from "../../../src/library/configuration";
import { MetricHandler } from "../../../src/library/handlers";

const ENV_nativeMetricsDisablers = "APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC";
const ENV_nativeMetricsDisableAll = "APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS";
describe("AutoCollection/NativePerformance", () => {
    var sandbox: sinon.SinonSandbox;

    before(() => {
        sandbox = sinon.createSandbox();
    })

    beforeEach(() => {
        JsonConfig["_instance"] = undefined;
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#Metrics", () => {
        it("init should enable and dispose should stop auto collection interval", () => {
            let metricHandler = new MetricHandler(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
            sandbox.stub(metricHandler["_metricReader"]["_exporter"], "export");
            let nativePerformance = new NativePerformanceMetrics(metricHandler.getMeter());
            nativePerformance.enable(true);
            if (
                nativePerformance["_metricsAvailable"]
            ) {
                assert.ok(nativePerformance["_handle"]);
                nativePerformance.enable(false);
                assert.ok(!nativePerformance["_handle"]);
            } else {
                assert.ok(!nativePerformance["_handle"]);
            }
        });

        it("should create instruments", () => {
            let metricHandler = new MetricHandler(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
            sandbox.stub(metricHandler["_metricReader"]["_exporter"], "export");
            let nativePerformance = new NativePerformanceMetrics(metricHandler.getMeter());
            assert.ok(nativePerformance["_eventLoopHistogram"], "_eventLoopHistogram not available");
            assert.ok(nativePerformance["_garbageCollectionScavenge"], "_garbageCollectionScavenge not available");
            assert.ok(nativePerformance["_garbageCollectionMarkSweepCompact"], "_garbageCollectionMarkSweepCompact not available");
            assert.ok(nativePerformance["_garbageCollectionIncrementalMarking"], "_garbageCollectionIncrementalMarking not available");
            assert.ok(nativePerformance["_heapMemoryTotalGauge"], "_heapMemoryTotalGauge not available");
            assert.ok(nativePerformance["_heapMemoryUsageGauge"], "_heapMemoryUsageGauge not available");
            assert.ok(nativePerformance["_memoryUsageNonHeapGauge"], "_memoryUsageNonHeapGauge not available");
        });

        it("should observe instruments during collection", (done) => {
            let metricHandler = new MetricHandler(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
            sandbox.stub(metricHandler["_metricReader"]["_exporter"], "export");
            let nativePerformance = new NativePerformanceMetrics(metricHandler.getMeter());
            nativePerformance.enable(true);
            metricHandler["_metricReader"].collect().then(({ resourceMetrics, errors }) => {
                assert.equal(errors.length, 0, "Errors found during collection");
                assert.equal(resourceMetrics.scopeMetrics.length, 1, "Wrong number of scopeMetrics");
                let metricsWithDataPoints: MetricData[] = []; // Only Metrics with data points will be exported
                resourceMetrics.scopeMetrics[0].metrics.forEach(metric => {
                    if (metric.dataPoints.length > 0) {
                        metricsWithDataPoints.push(metric);
                    }
                });
                if (nativePerformance["_metricsAvailable"]) {
                    assert.equal(metricsWithDataPoints.length, 3, "Wrong number of instruments");
                    assert.equal(metricsWithDataPoints[0].descriptor.name, NativeMetricsCounter.HEAP_MEMORY_TOTAL);
                    assert.equal(metricsWithDataPoints[1].descriptor.name, NativeMetricsCounter.HEAP_MEMORY_USAGE);
                    assert.equal(metricsWithDataPoints[2].descriptor.name, NativeMetricsCounter.MEMORY_USAGE_NON_HEAP);
                }
                else {
                    assert.equal(metricsWithDataPoints.length, 0, "Wrong number of instruments when metrics are not available");
                }
                done();
            }).catch((error) => done(error));
        });

        it("should collect histograms during collection", (done) => {
            let metricHandler = new MetricHandler(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
            sandbox.stub(metricHandler["_metricReader"]["_exporter"], "export");
            let nativePerformance = new NativePerformanceMetrics(metricHandler.getMeter());
            nativePerformance.enable(true);
            if (nativePerformance["_metricsAvailable"]) {
                nativePerformance["_collectHistogramData"](); // Method called every 15 seconds
            }
            metricHandler["_metricReader"].collect().then(({ resourceMetrics, errors }) => {
                assert.equal(errors.length, 0, "Errors found during collection");
                assert.equal(resourceMetrics.scopeMetrics.length, 1, "Wrong number of scopeMetrics");
                let metricsWithDataPoints: MetricData[] = []; // Only Metrics with data points will be exported
                resourceMetrics.scopeMetrics[0].metrics.forEach(metric => {
                    if (metric.dataPoints.length > 0) {
                        metricsWithDataPoints.push(metric);
                    }
                });
                if (nativePerformance["_metricsAvailable"]) {
                    assert.equal(metricsWithDataPoints.length, 7, "Wrong number of instruments");
                    assert.equal(metricsWithDataPoints[0].descriptor.name, NativeMetricsCounter.EVENT_LOOP_CPU);
                    assert.equal(metricsWithDataPoints[1].descriptor.name, NativeMetricsCounter.GARBAGE_COLLECTION_SCAVENGE);
                    assert.equal(metricsWithDataPoints[2].descriptor.name, NativeMetricsCounter.GARBAGE_COLLECTION_SWEEP_COMPACT);
                    assert.equal(metricsWithDataPoints[3].descriptor.name, NativeMetricsCounter.GARBAGE_COLLECTION_INCREMENTAL_MARKING);
                    assert.equal(metricsWithDataPoints[4].descriptor.name, NativeMetricsCounter.HEAP_MEMORY_TOTAL);
                    assert.equal(metricsWithDataPoints[5].descriptor.name, NativeMetricsCounter.HEAP_MEMORY_USAGE);
                    assert.equal(metricsWithDataPoints[5].descriptor.name, NativeMetricsCounter.MEMORY_USAGE_NON_HEAP);
                }
                else {
                    assert.equal(metricsWithDataPoints.length, 0, "Wrong number of instruments");
                }
                done();
            }).catch((error) => done(error));
        });

        it("Calling enable when metrics are not available should fail gracefully", () => {
            let metricHandler = new MetricHandler(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
            sandbox.stub(metricHandler["_metricReader"]["_exporter"], "export");
            var native = new NativePerformanceMetrics(metricHandler.getMeter());
            native["_metricsAvailable"] = false;
            assert.ok(!(<any>native)["_emitter"]);

            assert.doesNotThrow(
                () => native.enable(true),
                "Does not throw when native metrics are not available and trying to enable"
            );
            assert.doesNotThrow(
                () => native.enable(false),
                "Does not throw when native metrics are not available and trying to disable"
            );
        });
    });

    describe("#getNativeMetricsConfig", () => {
        it("should return equal input arg if no env vars are set", () => {
            const _customConfig = JsonConfig.getInstance();
            assert.deepEqual(getNativeMetricsConfig(true, _customConfig), {
                isEnabled: true,
                disabledMetrics: {},
            });
            assert.deepEqual(getNativeMetricsConfig(false, _customConfig), {
                isEnabled: false,
                disabledMetrics: {},
            });

            const config = { gc: true, heap: true };
            assert.deepEqual(getNativeMetricsConfig(config, _customConfig), {
                isEnabled: true,
                disabledMetrics: config,
            });
        });

        it("should overwrite input arg if disable all extended metrics env var is set", () => {
            const env = <{ [id: string]: string }>{};
            const originalEnv = process.env;

            env[ENV_nativeMetricsDisableAll] = "set";
            process.env = env;

            const _customConfig = JsonConfig.getInstance();

            assert.deepEqual(getNativeMetricsConfig(true, _customConfig), {
                isEnabled: false,
                disabledMetrics: {},
            });
            assert.deepEqual(getNativeMetricsConfig({}, _customConfig), {
                isEnabled: false,
                disabledMetrics: {},
            });
            assert.deepEqual(getNativeMetricsConfig({ gc: true }, _customConfig), {
                isEnabled: false,
                disabledMetrics: {},
            });

            process.env = originalEnv;
        });

        it("should overwrite input arg if individual env vars are set", () => {
            const expectation = { gc: true, heap: true };
            const env = <{ [id: string]: string }>{};
            const originalEnv = process.env;

            env[ENV_nativeMetricsDisablers] = "gc,heap";
            process.env = env;

            const _customConfig = JsonConfig.getInstance();

            let inConfig;

            inConfig = false;
            assert.deepEqual(getNativeMetricsConfig(inConfig, _customConfig), {
                isEnabled: false,
                disabledMetrics: expectation,
            });

            inConfig = true;
            assert.deepEqual(getNativeMetricsConfig(inConfig, _customConfig), {
                isEnabled: true,
                disabledMetrics: expectation,
            });

            inConfig = {};
            assert.deepEqual(getNativeMetricsConfig(inConfig, _customConfig), {
                isEnabled: true,
                disabledMetrics: expectation,
            });
            inConfig = { gc: true };
            assert.deepEqual(getNativeMetricsConfig(inConfig, _customConfig), {
                isEnabled: true,
                disabledMetrics: expectation,
            });
            inConfig = { loop: true };

            assert.deepEqual(getNativeMetricsConfig(inConfig, _customConfig), {
                isEnabled: true,
                disabledMetrics: { ...inConfig, ...expectation },
            });
            inConfig = { gc: false, loop: true, heap: "abc", something: "else" };
            assert.deepEqual(getNativeMetricsConfig(<any>inConfig, _customConfig), {
                isEnabled: true,
                disabledMetrics: { ...inConfig, ...expectation },
            });

            process.env = originalEnv;
        });
    });
});
