import { Histogram, Meter, MetricAttributes, ObservableCallback, ObservableGauge, ObservableResult, ValueType } from "@opentelemetry/api-metrics";
import {
    AggregatedMetricCounter,
    IMetricBaseDimensions,
    MetricId,
    StandardMetric
} from "./types";
import { HttpMetricsInstrumentation } from "./httpMetricsInstrumentation";
import { getMetricAttributes } from "./util";


export class AutoCollectStandardMetrics {
    private _isEnabled: boolean;
    private _httpMetrics: HttpMetricsInstrumentation
    private _meter: Meter;
    private _exceptionCountersCollection: Array<AggregatedMetricCounter>;
    private _traceCountersCollection: Array<AggregatedMetricCounter>;
    private _exceptionsGauge: ObservableGauge; // TODO: Not implemented
    private _exceptionsGaugeCallback: ObservableCallback;
    private _tracesGauge: ObservableGauge; // TODO: Not implemented
    private _tracesGaugeCallback: ObservableCallback;
    private _requestsDurationHistogram: Histogram;
    private _dependenciesDurationHistogram: Histogram;

    constructor(meter: Meter) {
        this._meter = meter;
        this._exceptionCountersCollection = [];
        this._traceCountersCollection = [];
        this._httpMetrics = HttpMetricsInstrumentation.getInstance();
        this._requestsDurationHistogram = this._meter.createHistogram(StandardMetric.REQUESTS, { valueType: ValueType.DOUBLE });
        this._dependenciesDurationHistogram = this._meter.createHistogram(StandardMetric.DEPENDENCIES, { valueType: ValueType.DOUBLE });
        this._exceptionsGauge = this._meter.createObservableGauge(StandardMetric.EXCEPTIONS, { valueType: ValueType.DOUBLE });
        this._tracesGauge = this._meter.createObservableGauge(StandardMetric.TRACES, { valueType: ValueType.DOUBLE });
        this._exceptionsGaugeCallback = this._getExceptions.bind(this);
        this._tracesGaugeCallback = this._getTraces.bind(this);
    }

    public enable(isEnabled: boolean) {
        this._isEnabled = isEnabled;
        if (this._isEnabled) {
            this._exceptionsGauge.addCallback(this._exceptionsGaugeCallback);
            this._tracesGauge.addCallback(this._tracesGaugeCallback);
            this._httpMetrics.enableStandardMetrics(this._requestsDurationHistogram, this._dependenciesDurationHistogram);
        } else {
            this._exceptionsGauge.removeCallback(this._exceptionsGaugeCallback);
            this._tracesGauge.removeCallback(this._tracesGaugeCallback);
            this._httpMetrics.disableStandardMetrics();
        }
    }

    private _getAggregatedCounter(
        dimensions: IMetricBaseDimensions,
        counterCollection: Array<AggregatedMetricCounter>
    ): AggregatedMetricCounter {
        let notMatch = false;
        // Check if counter with specified dimensions is available
        for (let i = 0; i < counterCollection.length; i++) {
            // Same object
            if (dimensions === counterCollection[i].dimensions) {
                return counterCollection[i];
            }
            // Different number of keys skip
            if (
                Object.keys(dimensions).length !==
                Object.keys(counterCollection[i].dimensions).length
            ) {
                continue;
            }
            // Check dimension values
            for (let dim in dimensions) {
                if ((<any>dimensions)[dim] != (<any>counterCollection[i].dimensions)[dim]) {
                    notMatch = true;
                    break;
                }
            }
            if (!notMatch) {
                // Found
                return counterCollection[i];
            }
            notMatch = false;
        }
        // Create a new one if not found
        let newCounter = new AggregatedMetricCounter(dimensions);
        counterCollection.push(newCounter);
        return newCounter;
    }

    private _getExceptions(observableResult: ObservableResult) {
        for (let i = 0; i < this._exceptionCountersCollection.length; i++) {
            var currentCounter = this._exceptionCountersCollection[i];
            currentCounter.time = +new Date();
            var intervalExceptions = currentCounter.totalCount - currentCounter.lastTotalCount || 0;
            var elapsedMs = currentCounter.time - currentCounter.lastTime;
            if (elapsedMs > 0 && intervalExceptions > 0) {
                let attributes = this._getMetricAttributes(currentCounter.dimensions, intervalExceptions, MetricId.EXCEPTIONS_COUNT);
                observableResult.observe(intervalExceptions, attributes);
            }
            // Set last counters
            currentCounter.lastTotalCount = currentCounter.totalCount;
            currentCounter.lastTime = currentCounter.time;
        }
    }

    private _getTraces(observableResult: ObservableResult) {
        for (let i = 0; i < this._traceCountersCollection.length; i++) {
            var currentCounter = this._traceCountersCollection[i];
            currentCounter.time = +new Date();
            var intervalTraces = currentCounter.totalCount - currentCounter.lastTotalCount || 0;
            var elapsedMs = currentCounter.time - currentCounter.lastTime;
            if (elapsedMs > 0 && intervalTraces > 0) {
                let attributes = this._getMetricAttributes(currentCounter.dimensions, intervalTraces, MetricId.TRACES_COUNT);
                observableResult.observe(intervalTraces, attributes);
            }
            // Set last counters
            currentCounter.lastTotalCount = currentCounter.totalCount;
            currentCounter.lastTime = currentCounter.time;
        }
    }

    private _getMetricAttributes(dimensions: IMetricBaseDimensions, aggregationInterval: number, metricType: string): MetricAttributes {
        let metricProperties = getMetricAttributes(dimensions);
        metricProperties = {
            ...metricProperties,
            "_MS.MetricId": metricType,
            "_MS.AggregationIntervalMs": String(aggregationInterval),
            "_MS.IsAutocollected": "True",
        };
        return metricProperties;
    }
}
