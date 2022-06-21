// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Counter, Meter, ObservableUpDownCounter, ValueType } from "@opentelemetry/api-metrics";
import { MeterProvider, MeterProviderOptions } from "@opentelemetry/sdk-metrics-base";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

import { BatchProcessor } from "./shared/batchProcessor";
import { MetricExporter } from "../exporters";
import { Config } from "../configuration";
import { IDisabledExtendedMetrics } from "../configuration/interfaces";
import {
    AutoCollectNativePerformance,
    AutoCollectPreAggregatedMetrics,
    AutoCollectPerformance,
} from "../../autoCollection";
import { MetricTelemetry } from "../../declarations/contracts";
import { QuickPulseCounter, StatsbeatTelemetryName } from "../../declarations/constants";
import {
    TelemetryItem as Envelope,
    MetricsData,
    MetricDataPoint,
    KnownDataPointType,
    KnownContextTagKeys,
} from "../../declarations/generated";
import {
    IMetricDependencyDimensions,
    IMetricExceptionDimensions,
    IMetricRequestDimensions,
    IMetricTraceDimensions,
} from "../../autoCollection/metrics/types";
import { ResourceManager } from "./resourceManager";
import { HeartBeat } from "../heartBeat";
import { Util } from "../util";


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
    private _batchProcessor: BatchProcessor;
    private _exporter: MetricExporter;
    private _performance: AutoCollectPerformance;
    private _preAggregatedMetrics: AutoCollectPreAggregatedMetrics;
    private _heartbeat: HeartBeat;
    private _nativePerformance: AutoCollectNativePerformance;

    // Live Metrics Perf counters
    private _requestDurationPerfCounter: ObservableUpDownCounter;
    private _requestFailedRatePerfCounter: ObservableUpDownCounter;
    private _requestRatePerfCounter: ObservableUpDownCounter;
    private _dependencyDurationPerfCounter: ObservableUpDownCounter;

    constructor(config: Config) {
        this._config = config;
        this._exporter = new MetricExporter(this._config);
        this._batchProcessor = new BatchProcessor(this._config, this._exporter);
        this._nativePerformance = new AutoCollectNativePerformance(this);
        this._initializeFlagsFromConfig();
        this._performance = new AutoCollectPerformance(this);
        this._preAggregatedMetrics = new AutoCollectPreAggregatedMetrics(this);
        this._heartbeat = new HeartBeat(this, this._config);

        const meterProviderConfig: MeterProviderOptions = {
            resource: ResourceManager.getInstance().getTraceResource(),
        };
        this._meterProvider = new MeterProvider(meterProviderConfig);
        this._meter = this._meterProvider.getMeter("ApplicationInsightsMeter");

        this._dependencyDurationPerfCounter = this._meter.createObservableUpDownCounter(QuickPulseCounter.DEPENDENCY_DURATION, { description: "", unit: "", valueType: ValueType.DOUBLE });
        this._requestDurationPerfCounter = this._meter.createObservableUpDownCounter(QuickPulseCounter.REQUEST_DURATION, { description: "Incoming Requests Average Execution Time", unit: "ms", valueType: ValueType.DOUBLE });
        this._requestFailedRatePerfCounter = this._meter.createObservableUpDownCounter(QuickPulseCounter.REQUEST_FAILURE_RATE, { description: "Incoming Requests Failed Rate", unit: "rps", valueType: ValueType.DOUBLE });
        this._requestRatePerfCounter = this._meter.createObservableUpDownCounter(QuickPulseCounter.REQUEST_RATE, { description: "Incoming Requests Rate", unit: "rps", valueType: ValueType.DOUBLE });
    }

    public start() {
        this._isStarted = true;
        this._performance.enable(this.isPerformance);
        this._preAggregatedMetrics.enable(this.isPreAggregatedMetrics);
        this._heartbeat.enable(this.isHeartBeat);
        this._nativePerformance.enable(this.isNativePerformance, this.disabledExtendedMetrics);
    }

    public async flush(): Promise<void> {
        await this._batchProcessor.triggerSend();
    }

    public async trackMetric(telemetry: MetricTelemetry): Promise<void> {
        const envelope = this._metricToEnvelope(telemetry, this._config.instrumentationKey);
        this._batchProcessor.send(envelope);
    }

    public async trackStatsbeatMetric(telemetry: MetricTelemetry): Promise<void> {
        const envelope = this._metricToEnvelope(telemetry, this._config.instrumentationKey);
        envelope.name = StatsbeatTelemetryName;
        this._batchProcessor.send(envelope);
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
        this._performance = null;
        this._preAggregatedMetrics.enable(false);
        this._preAggregatedMetrics = null;
        this._heartbeat.enable(false);
        this._heartbeat = null;
        this._nativePerformance.enable(false);
        this._nativePerformance = null;
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

    /**
     * Metric to Azure envelope parsing.
     * @internal
     */
    private _metricToEnvelope(telemetry: MetricTelemetry, instrumentationKey: string): Envelope {
        let baseType = "MetricData";
        let version = 1;
        let baseData: MetricsData = {
            metrics: [],
            version: 2,
        };
        const time = telemetry.time || new Date();
        // Exclude metrics from sampling by default
        let sampleRate = 100;
        let properties = {};

        const tags = this._getTags();
        let name =
            "Microsoft.ApplicationInsights." +
            instrumentationKey.replace(/-/g, "") +
            "." +
            baseType.substring(0, baseType.length - 4);
        if (telemetry.properties) {
            // sanitize properties
            properties = Util.getInstance().validateStringMap(telemetry.properties);
        }

        telemetry.metrics.forEach((metricPoint) => {
            var metricDataPoint: MetricDataPoint = {
                name: metricPoint.name,
                value: metricPoint.value,
            };
            metricDataPoint.count = !isNaN(metricPoint.count) ? metricPoint.count : 1;
            metricDataPoint.dataPointType = metricPoint.kind || KnownDataPointType.Aggregation; // Aggregation for Manual APIs
            metricDataPoint.max = !isNaN(metricPoint.max) ? metricPoint.max : metricPoint.value;
            metricDataPoint.min = !isNaN(metricPoint.min) ? metricPoint.min : metricPoint.value;
            metricDataPoint.stdDev = !isNaN(metricPoint.stdDev) ? metricPoint.stdDev : 0;
            metricDataPoint.namespace = metricPoint.namespace;
            baseData.metrics.push(metricDataPoint);
        });

        return {
            name,
            sampleRate,
            time,
            instrumentationKey,
            tags,
            version: version,
            data: {
                baseType,
                baseData: {
                    ...baseData,
                    properties,
                },
            },
        };
    }

    private _getTags() {
        var tags = <{ [key: string]: string }>{};
        const attributes = ResourceManager.getInstance().getMetricResource().attributes;
        const serviceName = attributes[SemanticResourceAttributes.SERVICE_NAME];
        const serviceNamespace = attributes[SemanticResourceAttributes.SERVICE_NAMESPACE];
        if (serviceName) {
            if (serviceNamespace) {
                tags[KnownContextTagKeys.AiCloudRole] = `${serviceNamespace}.${serviceName}`;
            } else {
                tags[KnownContextTagKeys.AiCloudRole] = String(serviceName);
            }
        }
        const serviceInstanceId = attributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID];
        tags[KnownContextTagKeys.AiCloudRoleInstance] = String(serviceInstanceId);
        return tags;
    }
}
