// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
    Histogram,
    Meter,
    ObservableCallback,
    ObservableGauge,
    ObservableResult,
    ValueType,
} from "@opentelemetry/api";
import { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import { MetricName } from "../types";


export class RequestMetrics {
    private _meter: Meter;
    private _httpDurationHistogram: Histogram;
    private _requestRateGauge: ObservableGauge;
    private _requestRateGaugeCallback: ObservableCallback;
    private _requestFailureRateGauge: ObservableGauge;
    private _requestFailureRateGaugeCallback: ObservableCallback;
    private _totalCount = 0;
    private _totalFailedCount = 0;
    private _intervalExecutionTime = 0;
    private _lastRequestRate: { count: number; time: number; executionInterval: number };
    private _lastFailureRequestRate: { count: number; time: number; executionInterval: number };

    constructor(meter: Meter) {
        this._meter = meter;
        this._httpDurationHistogram = this._meter.createHistogram(
            MetricName.REQUEST_DURATION,
            { valueType: ValueType.DOUBLE }
        );
        this._lastRequestRate = { count: 0, time: 0, executionInterval: 0 };
        this._lastFailureRequestRate = { count: 0, time: 0, executionInterval: 0 };
        this._requestRateGauge = this._meter.createObservableGauge(MetricName.REQUEST_RATE, {
            description: "Incoming Requests Average Execution Time",
            valueType: ValueType.DOUBLE,
        });
        this._requestFailureRateGauge = this._meter.createObservableGauge(
            MetricName.REQUEST_FAILURE_RATE,
            { description: "Incoming Requests Failed Rate", valueType: ValueType.DOUBLE }
        );
        this._requestRateGaugeCallback = this._getRequestRate.bind(this);
        this._requestFailureRateGaugeCallback = this._getFailureRequestRate.bind(this);
        this._lastRequestRate = {
            count: this._totalCount,
            time: +new Date(),
            executionInterval: this._intervalExecutionTime,
        };
        this._lastFailureRequestRate = {
            count: this._totalFailedCount,
            time: +new Date(),
            executionInterval: this._intervalExecutionTime,
        };
        this._requestRateGauge.addCallback(this._requestRateGaugeCallback);
        this._requestFailureRateGauge.addCallback(this._requestFailureRateGaugeCallback);
    }

    /** 
    * @deprecated This should not be used
    */
    public enable(isEnabled: boolean) {
        // No Op
    }

    public shutdown() {
        this._requestRateGauge.removeCallback(this._requestRateGaugeCallback);
        this._requestFailureRateGauge.removeCallback(this._requestFailureRateGaugeCallback);
    }

    public getDurationHistogram(): Histogram {
        return this._httpDurationHistogram;
    }

    public setRequestRate(span: ReadableSpan): void {
        const durationMs = span.duration[0];
        let success = false;
        const statusCode = parseInt(String(span.attributes[SemanticAttributes.HTTP_STATUS_CODE]));
        if (!isNaN(statusCode)) {
            success = 0 < statusCode && statusCode < 500;
        }

        if (success) {
            this._totalCount++;
        }
        else {
            this._totalFailedCount++;
        }
        this._intervalExecutionTime += durationMs;
    }

    private _getRequestRate(observableResult: ObservableResult) {
        const currentTime = +new Date();
        const intervalRequests =
            this._totalCount - this._lastRequestRate.count || 0;
        const elapsedMs = currentTime - this._lastRequestRate.time;
        if (elapsedMs > 0) {
            const elapsedSeconds = elapsedMs / 1000;
            const requestsPerSec = intervalRequests / elapsedSeconds;
            observableResult.observe(requestsPerSec);
        }
        this._lastRequestRate = {
            count: this._totalCount,
            time: currentTime,
            executionInterval: this._lastRequestRate.executionInterval,
        };
    }

    private _getFailureRequestRate(observableResult: ObservableResult) {
        const currentTime = +new Date();
        const intervalRequests =
            this._totalFailedCount - this._lastFailureRequestRate.count || 0;
        const elapsedMs = currentTime - this._lastFailureRequestRate.time;
        if (elapsedMs > 0) {
            const elapsedSeconds = elapsedMs / 1000;
            const requestsPerSec = intervalRequests / elapsedSeconds;
            observableResult.observe(requestsPerSec);
        }
        this._lastFailureRequestRate = {
            count: this._totalFailedCount,
            time: currentTime,
            executionInterval: this._lastFailureRequestRate.executionInterval,
        };
    }
}
