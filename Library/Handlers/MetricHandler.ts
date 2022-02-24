// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MetricExporter } from "../Exporters";
import { Config } from "../Configuration/Config";
import { AutoCollectPerformance } from "../../AutoCollection/Performance";
import { AutoCollectPreAggregatedMetrics } from "../../AutoCollection/PreAggregatedMetrics";
import { HeartBeat } from "../../AutoCollection/HeartBeat";
import { AutoCollectNativePerformance } from "../../AutoCollection/NativePerformance";
import { IDisabledExtendedMetrics } from "../../Declarations/Interfaces";
import * as Contracts from "../../Declarations/Contracts";
import {
    IMetricDependencyDimensions,
    IMetricExceptionDimensions,
    IMetricRequestDimensions,
    IMetricTraceDimensions
} from "../../Declarations/Metrics/AggregatedMetricDimensions";
import { MetricsData } from "../../Declarations/Generated";

export class MetricHandler {
    // Default values
    public isPerformance = true;
    public isPreAggregatedMetrics = true;
    public isHeartBeat = false;
    public isRequests = true;
    public isDependencies = true;
    public isNativePerformance = true;
    public disabledExtendedMetrics: IDisabledExtendedMetrics;
    public config: Config;

    private _exporter: MetricExporter;
    private _performance: AutoCollectPerformance;
    private _preAggregatedMetrics: AutoCollectPreAggregatedMetrics;
    private _heartbeat: HeartBeat;
    private _nativePerformance: AutoCollectNativePerformance;
    private _isStarted = false;


    constructor(config: Config) {
        this.config = config;
        this._initializeFlagsFromConfig();
        this._performance = new AutoCollectPerformance(this);
        this._preAggregatedMetrics = new AutoCollectPreAggregatedMetrics(this);
        this._heartbeat = new HeartBeat(this);
        if (!this._nativePerformance) {
            this._nativePerformance = new AutoCollectNativePerformance(this);
        }
    }

    public start() {
        this._isStarted = true;
        this._performance.enable(this.isPerformance);
        this._preAggregatedMetrics.enable(this.isPreAggregatedMetrics);
        this._heartbeat.enable(this.isHeartBeat);
        this._nativePerformance.enable(this.isNativePerformance, this.disabledExtendedMetrics);
    }

    public trackMetric(telemetry: Contracts.MetricTelemetry): void {

    }

    public setAutoCollectPerformance(value: boolean, collectExtendedMetrics: boolean | IDisabledExtendedMetrics = true) {
        this.isPerformance = value;
        const extendedMetricsConfig = this._nativePerformance.parseEnabled(collectExtendedMetrics, this.config);
        this.isNativePerformance = extendedMetricsConfig.isEnabled;
        this.disabledExtendedMetrics = extendedMetricsConfig.disabledMetrics;
        if (this._isStarted) {

            this._performance.enable(value);
            this._nativePerformance.enable(extendedMetricsConfig.isEnabled, extendedMetricsConfig.disabledMetrics);
        }
    }

    public setAutoCollectPreAggregatedMetrics(value: boolean) {
        this.isPreAggregatedMetrics = value;
        if (this._isStarted) {
            this._preAggregatedMetrics.enable(value);
        }
    }

    public setAutoCollectHeartbeat(value: boolean) {
        this.isHeartBeat = value;
        if (this._isStarted) {
            this._heartbeat.enable(value);
        }
    }

    public countPerformanceDependency(duration: number | string, success: boolean) {
        this._performance.countDependency(duration, success);
    }

    public countPerformanceException() {
        this._performance.countException();
    }

    public countPerformanceRequest(duration: number | string, success: boolean) {
        this._performance.countRequest(duration, success);
    }

    public countPreAggregatedException(dimensions: IMetricExceptionDimensions) {
        this._preAggregatedMetrics.countException(dimensions);
    }

    public countPreAggregatedTrace(dimensions: IMetricTraceDimensions) {
        this._preAggregatedMetrics.countTrace(dimensions);
    }

    public countPreAggregatedRequest(duration: number | string, dimensions: IMetricRequestDimensions) {
        this._preAggregatedMetrics.countRequest(duration, dimensions);
    }

    public countPreAggregatedDependency(duration: number | string, dimensions: IMetricDependencyDimensions) {
        this._preAggregatedMetrics.countDependency(duration, dimensions);
    }

    public dispose() {
        this._performance.enable(false);
        this._performance = null;
        this._preAggregatedMetrics.enable(false);
        this._preAggregatedMetrics = null;
        this._heartbeat.enable(false);
        this._heartbeat = null;
        this._nativePerformance.enable(false);
        this._nativePerformance = null;
    }

    private _initializeFlagsFromConfig() {
        this.isPerformance = this.config.enableAutoCollectPerformance !== undefined ? this.config.enableAutoCollectPerformance : this.isPerformance;
        this.isPreAggregatedMetrics = this.config.enableAutoCollectPreAggregatedMetrics !== undefined ? this.config.enableAutoCollectPreAggregatedMetrics : this.isPreAggregatedMetrics;
        this.isHeartBeat = this.config.enableAutoCollectHeartbeat !== undefined ? this.config.enableAutoCollectHeartbeat : this.isHeartBeat;
    }
}