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

export class DependencyMetrics {
    private _meter: Meter;
    private _httpMetrics: AzureHttpMetricsInstrumentation;
    private _dependencyFailureRateGauge: ObservableGauge;
    private _dependencyFailureRateGaugeCallback: ObservableCallback;
    private _dependencyRateGauge: ObservableGauge;
    private _dependencyRateGaugeCallback: ObservableCallback;
    private _lastDependencyRate: { count: number; time: number; executionInterval: number };
    private _lastFailureDependencyRate: { count: number; time: number; executionInterval: number };

    constructor(meter: Meter, httpMetrics: AzureHttpMetricsInstrumentation) {
        this._meter = meter;
        this._httpMetrics = httpMetrics;

        this._lastDependencyRate = { count: 0, time: 0, executionInterval: 0 };
        this._lastFailureDependencyRate = { count: 0, time: 0, executionInterval: 0 };
        this._dependencyRateGauge = this._meter.createObservableGauge(MetricName.DEPENDENCY_RATE, {
            description: "Incoming Requests Rate",
            valueType: ValueType.DOUBLE,
        });
        this._dependencyFailureRateGauge = this._meter.createObservableGauge(
            MetricName.DEPENDENCY_FAILURE_RATE,
            { description: "Failed Outgoing Requests per second", valueType: ValueType.DOUBLE }
        );
        this._dependencyFailureRateGaugeCallback = this._getFailureDependencyRate.bind(this);
        this._dependencyRateGaugeCallback = this._getDependencyRate.bind(this);
    }

    public enable(isEnabled: boolean) {
        if (isEnabled) {
            this._lastDependencyRate = {
                count: this._httpMetrics.totalDependencyCount,
                time: +new Date(),
                executionInterval: this._httpMetrics.intervalDependencyExecutionTime,
            };
            this._lastFailureDependencyRate = {
                count: this._httpMetrics.totalFailedRequestCount,
                time: +new Date(),
                executionInterval: this._httpMetrics.intervalDependencyExecutionTime,
            };
            this._dependencyFailureRateGauge.addCallback(this._dependencyFailureRateGaugeCallback);
            this._dependencyRateGauge.addCallback(this._dependencyRateGaugeCallback);
        } else {
            this._dependencyFailureRateGauge.removeCallback(
                this._dependencyFailureRateGaugeCallback
            );
            this._dependencyRateGauge.removeCallback(this._dependencyRateGaugeCallback);
        }
    }

    private _getDependencyRate(observableResult: ObservableResult) {
        const last = this._lastDependencyRate;
        const currentTime = +new Date();
        const intervalDependencys = this._httpMetrics.totalDependencyCount - last.count || 0;
        const elapsedMs = currentTime - last.time;
        if (elapsedMs > 0) {
            const elapsedSeconds = elapsedMs / 1000;
            const DependencysPerSec = intervalDependencys / elapsedSeconds;
            observableResult.observe(DependencysPerSec);
        }
        this._lastDependencyRate = {
            count: this._httpMetrics.totalDependencyCount,
            time: currentTime,
            executionInterval: last.executionInterval,
        };
    }

    private _getFailureDependencyRate(observableResult: ObservableResult) {
        const last = this._lastFailureDependencyRate;
        const currentTime = +new Date();
        const intervalDependencys = this._httpMetrics.totalFailedDependencyCount - last.count || 0;
        const elapsedMs = currentTime - last.time;
        if (elapsedMs > 0) {
            const elapsedSeconds = elapsedMs / 1000;
            const DependencysPerSec = intervalDependencys / elapsedSeconds;
            observableResult.observe(DependencysPerSec);
        }
        this._lastFailureDependencyRate = {
            count: this._httpMetrics.totalFailedDependencyCount,
            time: currentTime,
            executionInterval: last.executionInterval,
        };
    }
}
