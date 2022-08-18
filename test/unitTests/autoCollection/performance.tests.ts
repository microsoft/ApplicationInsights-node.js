import { MetricData } from "@opentelemetry/sdk-metrics-base";
import * as assert from "assert";
import * as sinon from "sinon";
import { PerformanceCounterMetricsHandler } from "../../../src/autoCollection";
import { PerformanceCounter, QuickPulseCounter } from "../../../src/autoCollection/metrics/types";
import { Config } from "../../../src/library/configuration";
import { MetricHandler } from "../../../src/library/handlers";


describe("PerformanceCounterMetricsHandler", () => {
    var sandbox: sinon.SinonSandbox;
    let metricHandler: MetricHandler;

    before(() => {
        sandbox = sinon.createSandbox();
        let config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        metricHandler = new MetricHandler(config);
        sandbox.stub(metricHandler["_metricReader"]["_exporter"], "export");
    })

    afterEach(() => {
        sandbox.restore();
    });

    describe("#Metrics", () => {
        it("should create instruments", () => {
            let performance = new PerformanceCounterMetricsHandler(metricHandler.getMeter());
            assert.ok(performance.getProcessMetrics()["_memoryPrivateBytesGauge"], "_dependencyDurationGauge not available");
            assert.ok(performance.getProcessMetrics()["_memoryAvailableBytesGauge"], "_dependencyDurationGauge not available");
            assert.ok(performance.getProcessMetrics()["_processorTimeGauge"], "_dependencyDurationGauge not available");
            assert.ok(performance.getProcessMetrics()["_processTimeGauge"], "_dependencyDurationGauge not available");
            assert.ok(performance.getRequestMetrics()["_requestRateGauge"], "_dependencyDurationGauge not available");
            assert.ok(performance.getRequestMetrics()["_requestDurationGauge"], "_dependencyDurationGauge not available");

            assert.ok(performance.getProcessMetrics()["_memoryCommittedBytesGauge"], "_memoryCommittedBytesGauge not available");
            assert.ok(performance.getRequestMetrics()["_requestFailureRateGauge"], "_requestFailureRateGauge not available");
            assert.ok(performance.getDependencyMetrics()["_dependencyFailureRateGauge"], "_dependencyFailureRateGauge not available");
            assert.ok(performance.getDependencyMetrics()["_dependencyRateGauge"], "_dependencyRateGauge not available");
            assert.ok(performance.getDependencyMetrics()["_dependencyDurationGauge"], "_dependencyDurationGauge not available");
            assert.ok(performance.getExceptionMetrics()["_exceptionsGauge"], "_exceptionRateGauge not available");
        });

        it("should observe instruments during collection", (done) => {
            let performance = new PerformanceCounterMetricsHandler(metricHandler.getMeter());
            performance.enable(true);

            metricHandler["_metricReader"].collect().then(({ resourceMetrics, errors }) => {
                assert.equal(errors.length, 0, "Errors found during collection");
                assert.equal(resourceMetrics.scopeMetrics.length, 1, "Wrong number of scopeMetrics");
                let metricsWithDataPoints: MetricData[] = []; // Only Metrics with data points will be exported
                resourceMetrics.scopeMetrics[0].metrics.forEach(metric => {
                    if (metric.dataPoints.length > 0) {
                        metricsWithDataPoints.push(metric);
                    }
                });

                assert.equal(metricsWithDataPoints.length, 6, "Wrong number of instruments");
                assert.equal(metricsWithDataPoints[0].descriptor.name, PerformanceCounter.PRIVATE_BYTES);
                assert.equal(metricsWithDataPoints[1].descriptor.name, PerformanceCounter.AVAILABLE_BYTES);
                assert.equal(metricsWithDataPoints[2].descriptor.name, PerformanceCounter.PROCESSOR_TIME);
                assert.equal(metricsWithDataPoints[3].descriptor.name, PerformanceCounter.PROCESS_TIME);
                assert.equal(metricsWithDataPoints[4].descriptor.name, PerformanceCounter.REQUEST_RATE);
                assert.equal(metricsWithDataPoints[5].descriptor.name, PerformanceCounter.REQUEST_DURATION);
                done();
            }).catch((error) => done(error));
        });

        it("should observe live metrics instruments during collection", (done) => {
            let config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            config.enableSendLiveMetrics = true;
            let performance = new PerformanceCounterMetricsHandler(metricHandler.getMeter());
            performance.enable(true);

            new Promise(resolve => setTimeout(resolve, 120)).then(() => {
                metricHandler["_metricReader"].collect().then(({ resourceMetrics, errors }) => {
                    assert.equal(errors.length, 0, "Errors found during collection");
                    assert.equal(resourceMetrics.scopeMetrics.length, 1, "Wrong number of scopeMetrics");
                    let metricsWithDataPoints: MetricData[] = []; // Only Metrics with data points will be exported
                    resourceMetrics.scopeMetrics[0].metrics.forEach(metric => {
                        if (metric.dataPoints.length > 0) {
                            metricsWithDataPoints.push(metric);
                        }
                    });

                    assert.equal(metricsWithDataPoints.length, 11, "Wrong number of instruments");
                    assert.equal(metricsWithDataPoints[6].descriptor.name, QuickPulseCounter.COMMITTED_BYTES);
                    assert.equal(metricsWithDataPoints[7].descriptor.name, QuickPulseCounter.DEPENDENCY_RATE);
                    assert.equal(metricsWithDataPoints[8].descriptor.name, QuickPulseCounter.DEPENDENCY_FAILURE_RATE);
                    assert.equal(metricsWithDataPoints[9].descriptor.name, QuickPulseCounter.DEPENDENCY_DURATION);
                    assert.equal(metricsWithDataPoints[10].descriptor.name, QuickPulseCounter.REQUEST_FAILURE_RATE);
                    done();
                }).catch((error) => done(error));
            });
        });

        it("should not collect when disabled", (done) => {
            let config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            metricHandler = new MetricHandler(config);
            sandbox.stub(metricHandler["_metricReader"]["_exporter"], "export");
            let performance = new PerformanceCounterMetricsHandler(metricHandler.getMeter());
            performance.enable(true);
            performance.enable(false);

            metricHandler["_metricReader"].collect().then(({ resourceMetrics, errors }) => {
                assert.equal(errors.length, 0, "Errors found during collection");
                assert.equal(resourceMetrics.scopeMetrics.length, 1, "Wrong number of scopeMetrics");
                let metricsWithDataPoints: MetricData[] = []; // Only Metrics with data points will be exported
                resourceMetrics.scopeMetrics[0].metrics.forEach(metric => {
                    if (metric.dataPoints.length > 0) {
                        metricsWithDataPoints.push(metric);
                    }
                });
                assert.equal(metricsWithDataPoints.length, 0, "Wrong number of instruments");
                done();
            }).catch((error) => done(error));
        });
    });
});
