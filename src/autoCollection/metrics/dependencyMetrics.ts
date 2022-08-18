// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Meter, ObservableCallback, ObservableGauge, ObservableResult, ValueType } from "@opentelemetry/api-metrics";
import { HttpMetricsInstrumentation } from "./httpMetricsInstrumentation";
import { QuickPulseCounter } from "./types";


export class DependencyMetrics {
    private _meter: Meter;
    private _httpMetrics: HttpMetricsInstrumentation;
    private _dependencyFailureRateGauge: ObservableGauge;
    private _dependencyFailureRateGaugeCallback: ObservableCallback;
    private _dependencyRateGauge: ObservableGauge;
    private _dependencyRateGaugeCallback: ObservableCallback;
    private _dependencyDurationGauge: ObservableGauge;
    private _dependencyDurationGaugeCallback: ObservableCallback;
    private _lastDependencyRate: { count: number; time: number; executionInterval: number; };
    private _lastFailureDependencyRate: { count: number; time: number; executionInterval: number; };
    private _lastDependencyDuration: { count: number; time: number; executionInterval: number; };

    constructor(meter: Meter, httpMetrics: HttpMetricsInstrumentation) {
        this._meter = meter;
        this._httpMetrics = httpMetrics;

        this._lastDependencyRate = { count: 0, time: 0, executionInterval: 0 };
        this._lastFailureDependencyRate = { count: 0, time: 0, executionInterval: 0 };
        this._lastDependencyDuration = { count: 0, time: 0, executionInterval: 0 };
        this._dependencyRateGauge = this._meter.createObservableGauge(QuickPulseCounter.DEPENDENCY_RATE, { description: "Incoming Requests Rate", valueType: ValueType.DOUBLE });
        this._dependencyFailureRateGauge = this._meter.createObservableGauge(QuickPulseCounter.DEPENDENCY_FAILURE_RATE, { description: "Failed Outgoing Requests per second", valueType: ValueType.DOUBLE });
        this._dependencyDurationGauge = this._meter.createObservableGauge(QuickPulseCounter.DEPENDENCY_DURATION, { description: "Average Outgoing Requests duration", valueType: ValueType.DOUBLE });
        this._dependencyFailureRateGaugeCallback = this._getFailureDependencyRate.bind(this);
        this._dependencyRateGaugeCallback = this._getDependencyRate.bind(this);
        this._dependencyDurationGaugeCallback = this._getDependencyDuration.bind(this);
    }

    public enable(isEnabled: boolean) {
        if (isEnabled) {
            this._lastDependencyRate = {
                count: this._httpMetrics.totalDependencyCount,
                time: +new Date(),
                executionInterval: this._httpMetrics.intervalDependencyExecutionTime
            };
            this._lastFailureDependencyRate = {
                count: this._httpMetrics.totalFailedRequestCount,
                time: +new Date(),
                executionInterval: this._httpMetrics.intervalDependencyExecutionTime
            };
            this._lastDependencyDuration = {
                count: this._httpMetrics.totalDependencyCount,
                time: +new Date(),
                executionInterval: this._httpMetrics.intervalDependencyExecutionTime
            };
            this._dependencyDurationGauge.addCallback(this._dependencyDurationGaugeCallback);
            this._dependencyFailureRateGauge.addCallback(this._dependencyFailureRateGaugeCallback);
            this._dependencyRateGauge.addCallback(this._dependencyRateGaugeCallback);
        } else {
            this._dependencyDurationGauge.removeCallback(this._dependencyDurationGaugeCallback);
            this._dependencyFailureRateGauge.removeCallback(this._dependencyFailureRateGaugeCallback);
            this._dependencyRateGauge.removeCallback(this._dependencyRateGaugeCallback);
        }
    }

    private _getDependencyDuration(observableResult: ObservableResult) {
        let currentTime = + new Date();
        var intervalDependencys = this._httpMetrics.totalDependencyCount - this._lastDependencyDuration.count || 0;
        var elapsedMs = currentTime - this._lastDependencyDuration.time;
        if (elapsedMs > 0) {
            var averageDependencyExecutionTime =
                (this._httpMetrics.intervalDependencyExecutionTime - this._lastDependencyDuration.executionInterval) /
                intervalDependencys || 0; // default to 0 in case no Dependencys in this interval
            this._lastDependencyDuration.executionInterval = this._httpMetrics.intervalDependencyExecutionTime; // reset
            observableResult.observe(averageDependencyExecutionTime);
        }
        this._lastDependencyDuration = {
            count: this._httpMetrics.totalDependencyCount,
            time: currentTime,
            executionInterval: this._lastDependencyDuration.executionInterval
        };
    }

    private _getDependencyRate(observableResult: ObservableResult) {
        var last = this._lastDependencyRate;
        let currentTime = + new Date();
        var intervalDependencys = this._httpMetrics.totalDependencyCount - last.count || 0;
        var elapsedMs = currentTime - last.time;
        if (elapsedMs > 0) {
            var elapsedSeconds = elapsedMs / 1000;
            var DependencysPerSec = intervalDependencys / elapsedSeconds;
            observableResult.observe(DependencysPerSec);
        }
        this._lastDependencyRate = {
            count: this._httpMetrics.totalDependencyCount,
            time: currentTime,
            executionInterval: last.executionInterval
        };
    }

    private _getFailureDependencyRate(observableResult: ObservableResult) {
        var last = this._lastFailureDependencyRate;
        let currentTime = + new Date();
        var intervalDependencys = this._httpMetrics.totalFailedDependencyCount - last.count || 0;
        var elapsedMs = currentTime - last.time;
        if (elapsedMs > 0) {
            var elapsedSeconds = elapsedMs / 1000;
            var DependencysPerSec = intervalDependencys / elapsedSeconds;
            observableResult.observe(DependencysPerSec);
        }
        this._lastFailureDependencyRate = {
            count: this._httpMetrics.totalFailedDependencyCount,
            time: currentTime,
            executionInterval: last.executionInterval
        };
    }
}
