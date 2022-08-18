// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Meter, ObservableCallback, ObservableGauge, ObservableResult, ValueType } from "@opentelemetry/api-metrics";
import { HttpMetricsInstrumentation } from "./httpMetricsInstrumentation";
import { PerformanceCounter, QuickPulseCounter } from "./types";


export class RequestMetrics {
    private _meter: Meter;
    private _httpMetrics: HttpMetricsInstrumentation;
    private _requestRateGauge: ObservableGauge;
    private _requestRateGaugeCallback: ObservableCallback;
    private _requestDurationGauge: ObservableGauge;
    private _requestDurationGaugeCallback: ObservableCallback;
    private _requestFailureRateGauge: ObservableGauge;
    private _requestFailureRateGaugeCallback: ObservableCallback;
    private _lastRequestRate: { count: number; time: number; executionInterval: number; };
    private _lastFailureRequestRate: { count: number; time: number; executionInterval: number; };
    private _lastRequestDuration: { count: number; time: number; executionInterval: number; };

    constructor(meter: Meter, httpMetrics: HttpMetricsInstrumentation) {
        this._meter = meter;
        this._httpMetrics = httpMetrics;
        this._lastRequestRate = { count: 0, time: 0, executionInterval: 0 };
        this._lastFailureRequestRate = { count: 0, time: 0, executionInterval: 0 };
        this._lastRequestDuration = { count: 0, time: 0, executionInterval: 0 };
        this._requestRateGauge = this._meter.createObservableGauge(PerformanceCounter.REQUEST_RATE, { description: "Incoming Requests Average Execution Time", valueType: ValueType.DOUBLE });
        this._requestDurationGauge = this._meter.createObservableGauge(PerformanceCounter.REQUEST_DURATION, { description: "Incoming Requests Average Execution Time", valueType: ValueType.DOUBLE });
        this._requestFailureRateGauge = this._meter.createObservableGauge(QuickPulseCounter.REQUEST_FAILURE_RATE, { description: "Incoming Requests Failed Rate", valueType: ValueType.DOUBLE })
        this._requestRateGaugeCallback = this._getRequestRate.bind(this);
        this._requestDurationGaugeCallback = this._getRequestDuration.bind(this);
        this._requestFailureRateGaugeCallback = this._getFailureRequestRate.bind(this);

    }

    public enable(isEnabled: boolean) {
        if (isEnabled) {
            this._lastRequestRate = {
                count: this._httpMetrics.totalRequestCount,
                time: +new Date(),
                executionInterval: this._httpMetrics.intervalRequestExecutionTime
            };
            this._lastFailureRequestRate = {
                count: this._httpMetrics.totalFailedRequestCount,
                time: +new Date(),
                executionInterval: this._httpMetrics.intervalRequestExecutionTime
            };
            this._lastRequestDuration = {
                count: this._httpMetrics.totalRequestCount,
                time: +new Date(),
                executionInterval: this._httpMetrics.intervalRequestExecutionTime
            };
            this._requestDurationGauge.addCallback(this._requestDurationGaugeCallback);
            this._requestRateGauge.addCallback(this._requestRateGaugeCallback);
            this._requestFailureRateGauge.addCallback(this._requestFailureRateGaugeCallback);
        } else {
            this._requestDurationGauge.removeCallback(this._requestDurationGaugeCallback);
            this._requestRateGauge.removeCallback(this._requestRateGaugeCallback);
            this._requestFailureRateGauge.removeCallback(this._requestFailureRateGaugeCallback);
        }
    }

    private _getRequestDuration(observableResult: ObservableResult) {
        let currentTime = + new Date();
        var intervalRequests = this._httpMetrics.totalRequestCount - this._lastRequestDuration.count || 0;
        var elapsedMs = currentTime - this._lastRequestDuration.time;
        if (elapsedMs > 0) {
            var averageRequestExecutionTime =
                (this._httpMetrics.intervalRequestExecutionTime - this._lastRequestDuration.executionInterval) /
                intervalRequests || 0; // default to 0 in case no requests in this interval
            this._lastRequestDuration.executionInterval = this._httpMetrics.intervalRequestExecutionTime; // reset
            observableResult.observe(averageRequestExecutionTime);
        }
        this._lastRequestDuration = {
            count: this._httpMetrics.totalRequestCount,
            time: currentTime,
            executionInterval: this._lastRequestDuration.executionInterval
        };
    }

    private _getRequestRate(observableResult: ObservableResult) {
        let currentTime = + new Date();
        var intervalRequests = this._httpMetrics.totalRequestCount - this._lastRequestRate.count || 0;
        var elapsedMs = currentTime - this._lastRequestRate.time;
        if (elapsedMs > 0) {
            var elapsedSeconds = elapsedMs / 1000;
            var requestsPerSec = intervalRequests / elapsedSeconds;
            observableResult.observe(requestsPerSec);
        }
        this._lastRequestRate = {
            count: this._httpMetrics.totalRequestCount,
            time: currentTime,
            executionInterval: this._lastRequestRate.executionInterval
        };
    }

    private _getFailureRequestRate(observableResult: ObservableResult) {
        let currentTime = + new Date();
        var intervalRequests = this._httpMetrics.totalFailedDependencyCount - this._lastFailureRequestRate.count || 0;
        var elapsedMs = currentTime - this._lastFailureRequestRate.time;
        if (elapsedMs > 0) {
            var elapsedSeconds = elapsedMs / 1000;
            var requestsPerSec = intervalRequests / elapsedSeconds;
            observableResult.observe(requestsPerSec);
        }
        this._lastFailureRequestRate = {
            count: this._httpMetrics.totalFailedDependencyCount,
            time: currentTime,
            executionInterval: this._lastFailureRequestRate.executionInterval
        };
    }
}
