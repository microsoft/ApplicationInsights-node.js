// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { BatchObservableResult, Meter, ObservableGauge, ValueType } from "@opentelemetry/api-metrics";
import { AggregatedMetricCounter, IStandardMetricBaseDimensions, IMetricExceptionDimensions, MetricName } from "../types";


export class ExceptionMetrics {
    private _meter: Meter;
    private _exceptionCountersCollection: Array<AggregatedMetricCounter>;
    private _exceptionsCountGauge: ObservableGauge;
    private _exceptionsRateGauge: ObservableGauge;

    constructor(meter: Meter) {
        this._meter = meter;
        this._exceptionCountersCollection = [];
        this._exceptionsCountGauge = this._meter.createObservableGauge(MetricName.EXCEPTION_COUNT, { valueType: ValueType.INT });
        this._exceptionsRateGauge = this._meter.createObservableGauge(MetricName.EXCEPTION_RATE, { valueType: ValueType.DOUBLE });
        this._meter.addBatchObservableCallback(this._getExceptionCount.bind(this), [this._exceptionsCountGauge,]);
        this._meter.addBatchObservableCallback(this._getExceptionRate.bind(this), [this._exceptionsRateGauge,]);
    }

    public countException(dimensions: IMetricExceptionDimensions) {
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

    private _getExceptionRate(observableResult: BatchObservableResult) {
        for (let i = 0; i < this._exceptionCountersCollection.length; i++) {
            var currentCounter = this._exceptionCountersCollection[i];
            currentCounter.time = +new Date();
            var intervalExceptions = currentCounter.totalCount - currentCounter.lastTotalCount || 0;
            var elapsedMs = currentCounter.time - currentCounter.lastTime;
            if (elapsedMs > 0 && intervalExceptions > 0) {
                var elapsedSeconds = elapsedMs / 1000;
                var exceptionsPerSec = intervalExceptions / elapsedSeconds;
                observableResult.observe(
                    this._exceptionsRateGauge,
                    exceptionsPerSec,
                    {
                        ...currentCounter.dimensions,
                    }
                );
            }
            // Set last counters
            currentCounter.lastTotalCount = currentCounter.totalCount;
            currentCounter.lastTime = currentCounter.time;
        }
    }

    private _getExceptionCount(observableResult: BatchObservableResult) {
        for (let i = 0; i < this._exceptionCountersCollection.length; i++) {
            var currentCounter = this._exceptionCountersCollection[i];
            currentCounter.time = +new Date();
            var intervalExceptions = currentCounter.totalCount - currentCounter.lastTotalCount || 0;
            var elapsedMs = currentCounter.time - currentCounter.lastTime;
            if (elapsedMs > 0 && intervalExceptions > 0) {
                observableResult.observe(
                    this._exceptionsCountGauge,
                    intervalExceptions,
                    {
                        ...currentCounter.dimensions,
                    }
                );
            }
            // Set last counters
            currentCounter.lastTotalCount = currentCounter.totalCount;
            currentCounter.lastTime = currentCounter.time;
        }
    }
}
