// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Meter, MetricAttributes, ObservableCallback, ObservableGauge, ObservableResult, ValueType } from "@opentelemetry/api-metrics";
import { AggregatedMetricCounter, StandardMetric, IStandardMetricBaseDimensions, IMetricTraceDimensions, MetricId } from "./types";


export class TraceMetrics {
    private _isEnabled: boolean;
    private _meter: Meter;
    private _traceCountersCollection: Array<AggregatedMetricCounter>;
    private _tracesGauge: ObservableGauge;
    private _tracesGaugeCallback: ObservableCallback;

    constructor(meter: Meter) {
        this._meter = meter;
        this._traceCountersCollection = [];
        this._tracesGauge = this._meter.createObservableGauge(StandardMetric.TRACES, { valueType: ValueType.DOUBLE });
        this._tracesGaugeCallback = this._getTraces.bind(this);
    }

    public enable(isEnabled: boolean) {
        this._isEnabled = isEnabled;
        if (this._isEnabled) {
            this._tracesGauge.addCallback(this._tracesGaugeCallback);
        } else {
            this._tracesGauge.removeCallback(this._tracesGaugeCallback);
        }
    }

    public countTrace(dimensions: IMetricTraceDimensions) {
        if (!this._isEnabled) {
            return;
        }
        let counter: AggregatedMetricCounter = this._getAggregatedCounter(
            dimensions,
            this._traceCountersCollection
        );
        counter.totalCount++;
    }

    private _getAggregatedCounter(
        dimensions: IStandardMetricBaseDimensions,
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

    private _getTraces(observableResult: ObservableResult) {
        for (let i = 0; i < this._traceCountersCollection.length; i++) {
            var currentCounter = this._traceCountersCollection[i];
            currentCounter.time = +new Date();
            var intervalTraces = currentCounter.totalCount - currentCounter.lastTotalCount || 0;
            var elapsedMs = currentCounter.time - currentCounter.lastTime;
            if (elapsedMs > 0 && intervalTraces > 0) {
                let attributes = this._getMetricAttributes(currentCounter.dimensions, elapsedMs, MetricId.TRACES_COUNT);
                observableResult.observe(intervalTraces, attributes);
            }
            // Set last counters
            currentCounter.lastTotalCount = currentCounter.totalCount;
            currentCounter.lastTime = currentCounter.time;
        }
    }

    private _getMetricAttributes(dimensions: IStandardMetricBaseDimensions, aggregationInterval: number, metricType: string): MetricAttributes {
        let attributes: MetricAttributes = {};
        attributes = {
            ...dimensions,
            "_MS.MetricId": metricType,
            "_MS.AggregationIntervalMs": String(aggregationInterval),
            "_MS.IsAutocollected": "True",
        };
        return attributes;
    }
}
