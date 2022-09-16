// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Meter, MetricAttributes, ObservableCallback, ObservableGauge, ObservableResult, ValueType } from "@opentelemetry/api-metrics";
import { AggregatedMetricCounter, IStandardMetricBaseDimensions, IMetricExceptionDimensions, MetricId, MetricName } from "../types";


export class ExceptionMetrics {
    private _isEnabled: boolean;
    private _meter: Meter;
    private _exceptionCountersCollection: Array<AggregatedMetricCounter>;
    private _exceptionsGauge: ObservableGauge;
    private _exceptionsGaugeCallback: ObservableCallback;

    constructor(meter: Meter) {
        this._meter = meter;
        this._exceptionCountersCollection = [];
        this._exceptionsGauge = this._meter.createObservableGauge(MetricName.EXCEPTION_RATE, { valueType: ValueType.DOUBLE });
        this._exceptionsGaugeCallback = this._getExceptions.bind(this);
    }

    public enable(isEnabled: boolean) {
        this._isEnabled = isEnabled;
        if (this._isEnabled) {
            this._exceptionsGauge.addCallback(this._exceptionsGaugeCallback);
        } else {
            this._exceptionsGauge.removeCallback(this._exceptionsGaugeCallback);
        }
    }

    public countException(dimensions: IMetricExceptionDimensions) {
        if (!this._isEnabled) {
            return;
        }
        let counter: AggregatedMetricCounter = this._getAggregatedCounter(
            dimensions,
            this._exceptionCountersCollection
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

    private _getExceptions(observableResult: ObservableResult) {
        for (let i = 0; i < this._exceptionCountersCollection.length; i++) {
            var currentCounter = this._exceptionCountersCollection[i];
            currentCounter.time = +new Date();
            var intervalExceptions = currentCounter.totalCount - currentCounter.lastTotalCount || 0;
            var elapsedMs = currentCounter.time - currentCounter.lastTime;
            if (elapsedMs > 0 && intervalExceptions > 0) {
                let attributes = this._getMetricAttributes(currentCounter.dimensions, elapsedMs, MetricId.TRACES_COUNT);
                observableResult.observe(intervalExceptions, attributes);
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
