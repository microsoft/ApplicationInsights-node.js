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
import { MetricName } from "../types";

export class DependencyMetrics {
    private _meter: Meter;
    private _httpDurationHistogram: Histogram;
    private _dependencyFailureRateGauge: ObservableGauge;
    private _dependencyFailureRateGaugeCallback: ObservableCallback;
    private _dependencyRateGauge: ObservableGauge;
    private _dependencyRateGaugeCallback: ObservableCallback;
    private _totalCount = 0;
    private _totalFailedCount = 0;
    private _intervalExecutionTime = 0;
    private _lastDependencyRate: { count: number; time: number; executionInterval: number };
    private _lastFailureDependencyRate: { count: number; time: number; executionInterval: number };

    constructor(meter: Meter) {
        this._meter = meter;
        this._httpDurationHistogram = this._meter.createHistogram(
            MetricName.DEPENDENCY_DURATION,
            { valueType: ValueType.DOUBLE }
        );
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
                count: this._totalCount,
                time: +new Date(),
                executionInterval: this._intervalExecutionTime,
            };
            this._lastFailureDependencyRate = {
                count: this._totalFailedCount,
                time: +new Date(),
                executionInterval: this._intervalExecutionTime,
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

    public getDurationHistogram(): Histogram {
        return this._httpDurationHistogram;
    }

    public setDependencyRate(durationMs: number, successful: boolean): void {
        if (successful) {
            this._totalCount++;
        }
        else {
            this._totalFailedCount++;
        }
        this._intervalExecutionTime += durationMs;
    }

    private _getDependencyRate(observableResult: ObservableResult) {
        const last = this._lastDependencyRate;
        const currentTime = +new Date();
        const intervalDependencys = this._totalCount - last.count || 0;
        const elapsedMs = currentTime - last.time;
        if (elapsedMs > 0) {
            const elapsedSeconds = elapsedMs / 1000;
            const DependencysPerSec = intervalDependencys / elapsedSeconds;
            observableResult.observe(DependencysPerSec);
        }
        this._lastDependencyRate = {
            count: this._totalCount,
            time: currentTime,
            executionInterval: last.executionInterval,
        };
    }

    private _getFailureDependencyRate(observableResult: ObservableResult) {
        const last = this._lastFailureDependencyRate;
        const currentTime = +new Date();
        const intervalDependencys = this._totalFailedCount - last.count || 0;
        const elapsedMs = currentTime - last.time;
        if (elapsedMs > 0) {
            const elapsedSeconds = elapsedMs / 1000;
            const DependencysPerSec = intervalDependencys / elapsedSeconds;
            observableResult.observe(DependencysPerSec);
        }
        this._lastFailureDependencyRate = {
            count: this._totalFailedCount,
            time: currentTime,
            executionInterval: last.executionInterval,
        };
    }
}
