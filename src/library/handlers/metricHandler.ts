// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

import { BatchProcessor } from "./shared/batchProcessor";
import { Config } from "../configuration";
import {
    StandardMetricsHandler,
    PerformanceCounterMetricsHandler,
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
import { HttpMetricsInstrumentation } from "../../autoCollection/metrics/collection/httpMetricsInstrumentation";
import { IMetricExceptionDimensions, IMetricTraceDimensions } from "../../autoCollection/metrics/types";
import { LiveMetricsHandler } from "../../autoCollection/metrics/handlers/liveMetricsHandler";
import { MetricExporter } from "../exporters";


export class MetricHandler {
    private _config: Config;
    private _batchProcessor: BatchProcessor;
    private _exporter: MetricExporter;
    private _perfCounterMetricsHandler: PerformanceCounterMetricsHandler;
    private _standardMetricsHandler: StandardMetricsHandler;
    private _liveMetricsHandler: LiveMetricsHandler;
    private _heartbeatHandler: HeartBeatHandler;

    constructor(config: Config) {
        this._config = config;
        this._exporter = new MetricExporter(this._config);
        this._batchProcessor = new BatchProcessor(this._config, this._exporter);
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
    }

    public start() {
        this._perfCounterMetricsHandler?.start();
        this._liveMetricsHandler?.start();
        this._standardMetricsHandler?.start();
        this._heartbeatHandler?.start();
    }

    public async shutdown(): Promise<void> {
        this._perfCounterMetricsHandler?.shutdown();
        this._standardMetricsHandler?.shutdown();
        this._liveMetricsHandler?.shutdown();
        this._heartbeatHandler?.shutdown();
    }

    public getConfig(): Config {
        return this._config;
    }

    public getStandardMetricsHandler(): StandardMetricsHandler {
        return this._standardMetricsHandler;
    }

    public getHttpMetricInstrumentations(): HttpMetricsInstrumentation[] {
        return [this._liveMetricsHandler?.getHttpMetricsInstrumentation(),
        this._perfCounterMetricsHandler?.getHttpMetricsInstrumentation(),
        this._standardMetricsHandler?.getHttpMetricsInstrumentation()];
    }

    public countException(dimensions: IMetricExceptionDimensions): void {
        this._liveMetricsHandler?.getExceptionMetrics().countException(dimensions);
        this._standardMetricsHandler?.getExceptionMetrics().countException(dimensions);
    }

    public countTrace(dimensions: IMetricTraceDimensions): void {
        this._standardMetricsHandler?.getTraceMetrics().countTrace(dimensions);
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
