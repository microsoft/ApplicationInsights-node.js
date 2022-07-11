// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Meter } from "@opentelemetry/api-metrics";
import {
    MeterProvider,
    MeterProviderOptions,
    PeriodicExportingMetricReader,
    PeriodicExportingMetricReaderOptions,
} from "@opentelemetry/sdk-metrics-base";
import { AzureExporterConfig, AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";

import { Config } from "../configuration";
import { IDisabledExtendedMetrics } from "../configuration/interfaces";
import {
    AutoCollectNativePerformance,
    AutoCollectPreAggregatedMetrics,
    AutoCollectPerformance,
} from "../../autoCollection";
import {
    IMetricDependencyDimensions,
    IMetricExceptionDimensions,
    IMetricRequestDimensions,
    IMetricTraceDimensions,
} from "../../autoCollection/metrics/types";
import { ResourceManager } from "./resourceManager";
import { HeartBeat } from "../../autoCollection/metrics/heartBeat";
import { createMeterProvider } from "../../autoCollection/metrics/utils";


export class MetricHandler {

    public isPerformance = true;
    public isPreAggregatedMetrics = true;
    public isHeartBeat = false;
    public isRequests = true;
    public isDependencies = true;
    public isNativePerformance = false;
    public disabledExtendedMetrics: IDisabledExtendedMetrics;
    private _meterProvider: MeterProvider;
    private _meter: Meter;
    private _config: Config;
    private _isStarted = false;
    private _performance: AutoCollectPerformance;
    private _preAggregatedMetrics: AutoCollectPreAggregatedMetrics;
    private _heartbeat: HeartBeat;
    private _nativePerformance: AutoCollectNativePerformance;

    constructor(config: Config) {
        this._config = config;
        this._initializeFlagsFromConfig();
        const meterProviderConfig: MeterProviderOptions = {
            resource: ResourceManager.getInstance().getTraceResource(),
        };
        this._meterProvider = createMeterProvider(this._config, meterProviderConfig);
        this._meter = this._meterProvider.getMeter("ApplicationInsightsMeter");
        this._nativePerformance = new AutoCollectNativePerformance(this._meter);
        this._performance = new AutoCollectPerformance(this._meter);
        this._preAggregatedMetrics = new AutoCollectPreAggregatedMetrics(this);

    }

    public start() {
        this._isStarted = true;
        this._performance.enable(this.isPerformance);
        this._preAggregatedMetrics.enable(this.isPreAggregatedMetrics);
        this._nativePerformance.enable(this.isNativePerformance, this.disabledExtendedMetrics);
    }

    public async flush(): Promise<void> {
        this._meterProvider.forceFlush();
    }

    public setAutoCollectPerformance(
        value: boolean,
        collectExtendedMetrics: boolean | IDisabledExtendedMetrics = true
    ) {
        this.isPerformance = value;
        const extendedMetricsConfig = this._nativePerformance.parseEnabled(
            collectExtendedMetrics,
            this._config
        );
        this.isNativePerformance = extendedMetricsConfig.isEnabled;
        this.disabledExtendedMetrics = extendedMetricsConfig.disabledMetrics;
        if (this._isStarted) {
            this._performance.enable(value);
            this._nativePerformance.enable(
                extendedMetricsConfig.isEnabled,
                extendedMetricsConfig.disabledMetrics
            );
        }
    }

    public setAutoCollectPreAggregatedMetrics(value: boolean) {
        this.isPreAggregatedMetrics = value;
        if (this._isStarted) {
            this._preAggregatedMetrics.enable(value);
        }
    }

    public enableAutoCollectHeartbeat() {
        this._heartbeat = new HeartBeat(this._config);
    }

    public countPreAggregatedException(dimensions: IMetricExceptionDimensions) {
        this._preAggregatedMetrics.countException(dimensions);
    }

    public countPreAggregatedTrace(dimensions: IMetricTraceDimensions) {
        this._preAggregatedMetrics.countTrace(dimensions);
    }

    public countPreAggregatedRequest(
        duration: number | string,
        dimensions: IMetricRequestDimensions
    ) {
        this._preAggregatedMetrics.countRequest(duration, dimensions);
    }

    public countPreAggregatedDependency(
        duration: number | string,
        dimensions: IMetricDependencyDimensions
    ) {
        this._preAggregatedMetrics.countDependency(duration, dimensions);
    }

    public async shutdown(): Promise<void> {
        this._performance.enable(false);
        this._preAggregatedMetrics.enable(false);
        
        this._nativePerformance.enable(false);
        this._heartbeat.shutdown();
        this._meterProvider.shutdown();
    }

    public getMeterProvider(): MeterProvider {
        return this._meterProvider;
    }

    public getMeter(): Meter {
        return this._meter;
    }

    private _initializeFlagsFromConfig() {
        this.isPerformance =
            this._config.enableAutoCollectPerformance !== undefined
                ? this._config.enableAutoCollectPerformance
                : this.isPerformance;
        this.isPreAggregatedMetrics =
            this._config.enableAutoCollectPreAggregatedMetrics !== undefined
                ? this._config.enableAutoCollectPreAggregatedMetrics
                : this.isPreAggregatedMetrics;
        this.isHeartBeat =
            this._config.enableAutoCollectHeartbeat !== undefined
                ? this._config.enableAutoCollectHeartbeat
                : this.isHeartBeat;

        const extendedMetricsConfig = this._nativePerformance.parseEnabled(
            this._config.enableAutoCollectExtendedMetrics || this.isNativePerformance,
            this._config
        );
        this.isNativePerformance = extendedMetricsConfig.isEnabled;
        this.disabledExtendedMetrics = extendedMetricsConfig.disabledMetrics;
    }
}
