// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
    BatchObservableResult,
    Meter,
    ObservableGauge,
    ValueType,
} from "@opentelemetry/api-metrics";
import {
    AggregatedMetricCounter,
    IMetricTraceDimensions,
    IStandardMetricBaseDimensions,
    MetricName,
} from "../types";

export class TraceMetrics {
    private _meter: Meter;
    private _traceCountersCollection: Array<AggregatedMetricCounter>;
    private _tracesCountGauge: ObservableGauge;
    private _tracesRateGauge: ObservableGauge;

    constructor(meter: Meter) {
        this._meter = meter;
        this._traceCountersCollection = [];
        this._tracesCountGauge = this._meter.createObservableGauge(MetricName.TRACE_COUNT, {
            valueType: ValueType.INT,
        });
        this._tracesRateGauge = this._meter.createObservableGauge(MetricName.TRACE_RATE, {
            valueType: ValueType.DOUBLE,
        });
        this._meter.addBatchObservableCallback(this._getTraceCount.bind(this), [
            this._tracesCountGauge,
        ]);
        this._meter.addBatchObservableCallback(this._getTraceRate.bind(this), [
            this._tracesRateGauge,
        ]);
    }

    public countTrace(dimensions: IMetricTraceDimensions) {
        const counter: AggregatedMetricCounter = this._getAggregatedCounter(
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
            for (const dim in dimensions) {
                if ((<any>dimensions)[dim] !== (<any>counterCollection[i].dimensions)[dim]) {
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
        const newCounter = new AggregatedMetricCounter(dimensions);
        counterCollection.push(newCounter);
        return newCounter;
    }

    private _getTraceRate(observableResult: BatchObservableResult) {
        for (let i = 0; i < this._traceCountersCollection.length; i++) {
            const currentCounter = this._traceCountersCollection[i];
            currentCounter.time = +new Date();
            const intervalTraces = currentCounter.totalCount - currentCounter.lastTotalCount || 0;
            const elapsedMs = currentCounter.time - currentCounter.lastTime;
            if (elapsedMs > 0 && intervalTraces > 0) {
                const elapsedSeconds = elapsedMs / 1000;
                const tracesPerSec = intervalTraces / elapsedSeconds;
                observableResult.observe(this._tracesRateGauge, tracesPerSec, {
                    ...currentCounter.dimensions,
                });
            }
            // Set last counters
            currentCounter.lastTotalCount = currentCounter.totalCount;
            currentCounter.lastTime = currentCounter.time;
        }
    }

    private _getTraceCount(observableResult: BatchObservableResult) {
        for (let i = 0; i < this._traceCountersCollection.length; i++) {
            const currentCounter = this._traceCountersCollection[i];
            currentCounter.time = +new Date();
            const intervalTraces = currentCounter.totalCount - currentCounter.lastTotalCount || 0;
            const elapsedMs = currentCounter.time - currentCounter.lastTime;
            if (elapsedMs > 0 && intervalTraces > 0) {
                observableResult.observe(this._tracesCountGauge, intervalTraces, {
                    ...currentCounter.dimensions,
                });
            }
            // Set last counters
            currentCounter.lastTotalCount = currentCounter.totalCount;
            currentCounter.lastTime = currentCounter.time;
        }
    }
}
