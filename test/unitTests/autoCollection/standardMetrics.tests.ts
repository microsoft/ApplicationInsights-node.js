import { InstrumentType, MetricData } from "@opentelemetry/sdk-metrics-base";
import * as assert from "assert";
import * as sinon from "sinon";

import { AutoCollectStandardMetrics } from "../../../src/autoCollection/metrics/standardMetrics";
import { IMetricExceptionDimensions, StandardMetric } from "../../../src/autoCollection/metrics/types";
import { Config } from "../../../src/library/configuration";
import { MetricHandler } from "../../../src/library/handlers";


describe("AutoCollection/StandardMetrics", () => {
    var sandbox: sinon.SinonSandbox;

    before(() => {
        sandbox = sinon.createSandbox();
    });

    describe("#AutoCollectStandardMetrics", () => {
        let metricHandler: MetricHandler;

        beforeEach(() => {
            let config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            metricHandler = new MetricHandler(config);
            sandbox.stub(metricHandler["_metricReader"]["_exporter"], "export");
        });

        afterEach(() => {
            sandbox.restore();
            metricHandler.shutdown();
        });
        it("should create instruments", () => {
            let autoCollect = new AutoCollectStandardMetrics(metricHandler.getMeter());
            assert.ok(autoCollect["_exceptionsGauge"], "_exceptionsGauge not available");
            assert.ok(autoCollect["_tracesGauge"], "_tracesGauge not available");
        });

        it("should observe instruments during collection", (done) => {
            let autoCollect = new AutoCollectStandardMetrics(metricHandler.getMeter());
            autoCollect.enable(true);
            let dimensions: IMetricExceptionDimensions = {
                cloudRoleInstance: "testcloudRoleInstance",
                cloudRoleName: "testcloudRoleName"
            };
            autoCollect.countException(dimensions);
            autoCollect.countTrace(dimensions);
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
                    assert.equal(metricsWithDataPoints.length, 2, "Wrong number of instruments");
                    assert.equal(metricsWithDataPoints[0].descriptor.name, StandardMetric.EXCEPTIONS);
                    assert.equal(metricsWithDataPoints[0].descriptor.type, InstrumentType.OBSERVABLE_GAUGE);
                    assert.equal(metricsWithDataPoints[0].dataPoints.length, 1);
                    assert.equal(metricsWithDataPoints[0].dataPoints[0].value, 1);
                    assert.equal(metricsWithDataPoints[0].dataPoints[0].attributes["cloudRoleInstance"], 'testcloudRoleInstance');
                    assert.equal(metricsWithDataPoints[0].dataPoints[0].attributes["cloudRoleName"], 'testcloudRoleName');
                    assert.equal(metricsWithDataPoints[1].descriptor.name, StandardMetric.TRACES);
                    assert.equal(metricsWithDataPoints[1].descriptor.type, InstrumentType.OBSERVABLE_GAUGE);
                    assert.equal(metricsWithDataPoints[1].dataPoints.length, 1);
                    assert.equal(metricsWithDataPoints[1].dataPoints[0].value, 1);
                    assert.equal(metricsWithDataPoints[1].dataPoints[0].attributes["cloudRoleInstance"], 'testcloudRoleInstance');
                    assert.equal(metricsWithDataPoints[1].dataPoints[0].attributes["cloudRoleName"], 'testcloudRoleName');
                    done();
                }).catch((error) => done(error));
            });
        });

        it("should not collect when disabled", (done) => {
            let autoCollect = new AutoCollectStandardMetrics(metricHandler.getMeter());
            autoCollect.enable(true);
            autoCollect.enable(false);

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
