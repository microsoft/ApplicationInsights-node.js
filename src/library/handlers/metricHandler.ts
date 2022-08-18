// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { RequestOptions } from "https";
import { AzureExporterConfig, AzureMonitorMetricExporter, } from "@azure/monitor-opentelemetry-exporter";
import { Meter } from "@opentelemetry/api-metrics";
import {
    MeterProvider,
    MeterProviderOptions,
    PeriodicExportingMetricReader,
    PeriodicExportingMetricReaderOptions,
} from "@opentelemetry/sdk-metrics-base";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

import { BatchProcessor } from "./shared/batchProcessor";
import { MetricExporter } from "../exporters";
import { Config } from "../configuration";
import { IDisabledExtendedMetrics } from "../configuration/interfaces";
import {
    NativePerformanceMetrics,
    StandardMetricsHandler,
    PerformanceCounterMetricsHandler,
    getNativeMetricsConfig,
} from "../../autoCollection";
import { MetricTelemetry } from "../../declarations/contracts";
import * as Contracts from "../../declarations/contracts";
import * as Constants from "../../declarations/constants";
import {
    TelemetryItem as Envelope,
    MetricsData,
    MetricDataPoint,
    KnownDataPointType,
    KnownContextTagKeys,
} from "../../declarations/generated";
import { ResourceManager } from "./resourceManager";
import { HeartBeatHandler } from "../../autoCollection/metrics/handlers/heartBeatHandler";
import { Util } from "../util";
import { HttpMetricsInstrumentation } from "../../autoCollection/metrics/httpMetricsInstrumentation";
import { HttpMetricsInstrumentationConfig, IMetricExceptionDimensions, IMetricTraceDimensions } from "../../autoCollection/metrics/types";
import { LiveMetricsHandler } from "../../autoCollection/metrics/handlers/liveMetricsHandler";


export class MetricHandler {

    public isPerformanceCountersEnabled = true;
    public isLiveMetricsEnabled = true;
    public isStandardMetricsEnabled = true;
    public isHeartBeatEnabled = false;
    public isNativePerformanceEnabled = false;
    public disabledExtendedMetrics: IDisabledExtendedMetrics;


    private _meterProvider: MeterProvider;
    private _meter: Meter;
    private _config: Config;
    private _isStarted = false;
    private _batchProcessor: BatchProcessor;
    private _perfCounterMetricsHandler: PerformanceCounterMetricsHandler;
    private _standardMetricsHandler: StandardMetricsHandler;
    private _liveMetricsHandler: LiveMetricsHandler;
    private _heartbeatHandler: HeartBeatHandler;
    private _nativePerformance: NativePerformanceMetrics;

    constructor(config: Config) {
        this._config = config;
        this._initializeFlagsFromConfig();
        const httpMetricsConfig: HttpMetricsInstrumentationConfig = {
            ignoreOutgoingRequestHook: (request: RequestOptions) => {
                if (request.headers && request.headers["user-agent"]) {
                    return request.headers["user-agent"].toString().indexOf("azsdk-js-monitor-opentelemetry-exporter") > -1;
                }
                return false;
            }
        };

        // Create StandardMetrics, PerfCounters and LiveMetrics Handlers
        if (this._config.enableAutoCollectPreAggregatedMetrics) {
            this._standardMetricsHandler = new StandardMetricsHandler(this._config);
        }
        if (this._config.enableSendLiveMetrics) {
            this._liveMetricsHandler = new LiveMetricsHandler(this._config);
        }
        if (this._config.enableAutoCollectPerformance) {
            this._perfCounterMetricsHandler = new PerformanceCounterMetricsHandler(this._config);
        }
        if (this._config.enableAutoCollectHeartbeat) {
            this._heartbeatHandler = new HeartBeatHandler(this._config);
        }


        this._nativePerformance = new NativePerformanceMetrics(this._meter);


    }

    public start() {
        this._isStarted = true;
        this._perfCounterMetricsHandler.enable(this.isPerformanceCountersEnabled);
        this._liveMetricsHandler.enable(this.isLiveMetricsEnabled);
        this._standardMetricsHandler.enable(this.isStandardMetricsEnabled);
        this._nativePerformance.enable(this.isNativePerformanceEnabled, this.disabledExtendedMetrics);
        this._heartbeatHandler.enable(this.isHeartBeatEnabled);
    }

    public async flush(): Promise<void> {
        await this._batchProcessor.triggerSend();
    }

    public async trackMetric(telemetry: Contracts.MetricTelemetry): Promise<void> {
        const envelope = this._metricToEnvelope(telemetry, this._config.instrumentationKey);
        this.track(envelope);
    }

    public async trackStatsbeatMetric(telemetry: Contracts.MetricTelemetry): Promise<void> {
        const envelope = this._metricToEnvelope(telemetry, this._config.instrumentationKey);
        envelope.name = Constants.StatsbeatTelemetryName;
        this.track(envelope);
    }

    /**
     * Log a user action or other occurrence.
     * @param telemetry      Object encapsulating tracking options
     */
    public track(telemetry: Envelope): void {
        this._batchProcessor.send(telemetry);
    }

    public setAutoCollectPerformance(
        value: boolean,
        collectExtendedMetrics: boolean | IDisabledExtendedMetrics = true
    ) {
        this.isPerformanceCountersEnabled = value;
        const extendedMetricsConfig = getNativeMetricsConfig(
            collectExtendedMetrics,
            this._config
        );
        this.isNativePerformanceEnabled = extendedMetricsConfig.isEnabled;
        this.disabledExtendedMetrics = extendedMetricsConfig.disabledMetrics;
        if (this._isStarted) {
            this._perfCounterMetricsHandler.enable(value);
            this._nativePerformance.enable(
                extendedMetricsConfig.isEnabled,
                extendedMetricsConfig.disabledMetrics
            );
        }
    }

    public setAutoCollectHeartbeat(value: boolean) {
        this.isHeartBeatEnabled = value;
        if (this._isStarted) {
            this._heartbeatHandler.enable(value);
        }
    }

    public setAutoCollectPreAggregatedMetrics(value: boolean) {
        this.isStandardMetricsEnabled = value;
        if (this._isStarted) {
            this._standardMetricsHandler.enable(value);
        }
    }

    public getStandardMetricsHandler(): StandardMetricsHandler {
        return this._standardMetricsHandler;
    }

    public getPerformanceMetricsHandler(): PerformanceCounterMetricsHandler {
        return this._perfCounterMetricsHandler;
    }

    public getLiveMetricsHandler(): LiveMetricsHandler {
        return this._liveMetricsHandler;
    }

    public enableAutoCollectHeartbeat() {
        this._heartbeatHandler = new HeartBeatHandler(this._config);
    }

    public async shutdown(): Promise<void> {
        this._perfCounterMetricsHandler.enable(false);
        this._standardMetricsHandler.enable(false);
        this._nativePerformance.enable(false);
        this._heartbeatHandler.shutdown();
        this._meterProvider.shutdown();
    }

    public getMeterProvider(): MeterProvider {
        return this._meterProvider;
    }

    public getMeter(): Meter {
        return this._meter;
    }

    public getConfig(): Config {
        return this._config;
    }

    public getHttpMetricInstrumentations(): HttpMetricsInstrumentation[] {
        return [this._liveMetricsHandler.getHttpMetricsInstrumentation(),
        this._perfCounterMetricsHandler.getHttpMetricsInstrumentation(),
        this._standardMetricsHandler.getHttpMetricsInstrumentation()];
    }


    public countException(dimensions: IMetricExceptionDimensions): void {
        this._liveMetricsHandler.getExceptionMetrics().countException(dimensions);
        this._standardMetricsHandler.getExceptionMetrics().countException(dimensions);
        this._perfCounterMetricsHandler.getExceptionMetrics().countException(dimensions);
    }

    public countTrace(dimensions: IMetricTraceDimensions): void {
        this._liveMetricsHandler.getTraceMetrics().countTrace(dimensions);
        this._standardMetricsHandler.getTraceMetrics().countTrace(dimensions);
        this._perfCounterMetricsHandler.getTraceMetrics().countTrace(dimensions);
    }

    private _initializeFlagsFromConfig() {
        this.isPerformanceCountersEnabled =
            this._config.enableAutoCollectPerformance !== undefined
                ? this._config.enableAutoCollectPerformance
                : this.isPerformanceCountersEnabled;
        this.isStandardMetricsEnabled =
            this._config.enableAutoCollectPreAggregatedMetrics !== undefined
                ? this._config.enableAutoCollectPreAggregatedMetrics
                : this.isStandardMetricsEnabled;
        this.isHeartBeatEnabled =
            this._config.enableAutoCollectHeartbeat !== undefined
                ? this._config.enableAutoCollectHeartbeat
                : this.isHeartBeatEnabled;

        const extendedMetricsConfig = getNativeMetricsConfig(
            this._config.enableAutoCollectExtendedMetrics || this.isNativePerformanceEnabled,
            this._config
        );
        this.isNativePerformanceEnabled = extendedMetricsConfig.isEnabled;
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
