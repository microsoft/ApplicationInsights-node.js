// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
    Meter,
    ObservableCallback,
    ObservableGauge,
    ObservableResult,
    ValueType,
} from "@opentelemetry/api-metrics";
import { AzureHttpMetricsInstrumentation } from "./azureHttpMetricsInstrumentation";
import { MetricName } from "../types";

export class RequestMetrics {
    private _meter: Meter;
    private _httpMetrics: AzureHttpMetricsInstrumentation;
    private _requestRateGauge: ObservableGauge;
    private _requestRateGaugeCallback: ObservableCallback;
    private _requestFailureRateGauge: ObservableGauge;
    private _requestFailureRateGaugeCallback: ObservableCallback;
    private _lastRequestRate: { count: number; time: number; executionInterval: number };
    private _lastFailureRequestRate: { count: number; time: number; executionInterval: number };

    constructor(meter: Meter, httpMetrics: AzureHttpMetricsInstrumentation) {
        this._meter = meter;
        this._httpMetrics = httpMetrics;
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
    }

    public enable(isEnabled: boolean) {
        if (isEnabled) {
            this._lastRequestRate = {
                count: this._httpMetrics.totalRequestCount,
                time: +new Date(),
                executionInterval: this._httpMetrics.intervalRequestExecutionTime,
            };
            this._lastFailureRequestRate = {
                count: this._httpMetrics.totalFailedRequestCount,
                time: +new Date(),
                executionInterval: this._httpMetrics.intervalRequestExecutionTime,
            };
            this._requestRateGauge.addCallback(this._requestRateGaugeCallback);
            this._requestFailureRateGauge.addCallback(this._requestFailureRateGaugeCallback);
        } else {
            this._requestRateGauge.removeCallback(this._requestRateGaugeCallback);
            this._requestFailureRateGauge.removeCallback(this._requestFailureRateGaugeCallback);
        }
    }

    private _getRequestRate(observableResult: ObservableResult) {
        let currentTime = +new Date();
        var intervalRequests =
            this._httpMetrics.totalRequestCount - this._lastRequestRate.count || 0;
        var elapsedMs = currentTime - this._lastRequestRate.time;
        if (elapsedMs > 0) {
            var elapsedSeconds = elapsedMs / 1000;
            var requestsPerSec = intervalRequests / elapsedSeconds;
            observableResult.observe(requestsPerSec);
        }
        this._lastRequestRate = {
            count: this._httpMetrics.totalRequestCount,
            time: currentTime,
            executionInterval: this._lastRequestRate.executionInterval,
        };
    }

    private _getFailureRequestRate(observableResult: ObservableResult) {
        let currentTime = +new Date();
        var intervalRequests =
            this._httpMetrics.totalFailedDependencyCount - this._lastFailureRequestRate.count || 0;
        var elapsedMs = currentTime - this._lastFailureRequestRate.time;
        if (elapsedMs > 0) {
            var elapsedSeconds = elapsedMs / 1000;
            var requestsPerSec = intervalRequests / elapsedSeconds;
            observableResult.observe(requestsPerSec);
        }
        this._lastFailureRequestRate = {
            count: this._httpMetrics.totalFailedDependencyCount,
            time: currentTime,
            executionInterval: this._lastFailureRequestRate.executionInterval,
        };
    }
}
