// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { SpanKind } from "@opentelemetry/api";
import { ReadableSpan, Span, TimedEvent } from "@opentelemetry/sdk-trace-base";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { ApplicationInsightsConfig } from "../shared";
import {
    CustomMetricsHandler,
    HeartBeatHandler,
    StandardMetricsHandler,
    PerformanceCounterMetricsHandler,
} from "./handlers";
import { IMetricTraceDimensions, IStandardMetricBaseDimensions } from "./types";

export class MetricHandler {
    private _config: ApplicationInsightsConfig;
    private _perfCounterMetricsHandler: PerformanceCounterMetricsHandler;
    private _standardMetricsHandler: StandardMetricsHandler;
    private _heartbeatHandler: HeartBeatHandler;
    private _customMetricsHandler: CustomMetricsHandler;

    constructor(config: ApplicationInsightsConfig) {
        this._config = config;
        this._customMetricsHandler = new CustomMetricsHandler(config);
        if (this._config.enableAutoCollectStandardMetrics) {
            this._standardMetricsHandler = new StandardMetricsHandler(this._config);
        }
        if (this._config.enableAutoCollectPerformance) {
            this._perfCounterMetricsHandler = new PerformanceCounterMetricsHandler(this._config);
        }
        if (this._config.enableAutoCollectHeartbeat) {
            this._heartbeatHandler = new HeartBeatHandler(this._config);
        }
    }

    /** 
   * @deprecated This should not be used
   */
    public start() {
        // No Op
    }

    public async shutdown(): Promise<void> {
        this._customMetricsHandler?.shutdown();
        this._perfCounterMetricsHandler?.shutdown();
        this._standardMetricsHandler?.shutdown();
        this._heartbeatHandler?.shutdown();
    }

    public async flush(): Promise<void> {
        await this._customMetricsHandler?.flush();
        await this._heartbeatHandler?.flush();
        await this._standardMetricsHandler?.flush();
        await this._perfCounterMetricsHandler?.flush();
    }

    public getConfig(): ApplicationInsightsConfig {
        return this._config;
    }

    public getCustomMetricsHandler(): CustomMetricsHandler {
        return this._customMetricsHandler;
    }

    public markSpanAsProcceseded(span: Span): void {
        if (this._config.enableAutoCollectStandardMetrics) {
            if (span.kind === SpanKind.CLIENT) {
                span.setAttributes({
                    "_MS.ProcessedByMetricExtractors": "(Name:'Dependencies', Ver:'1.1')",
                });
            } else if (span.kind === SpanKind.SERVER) {
                span.setAttributes({
                    "_MS.ProcessedByMetricExtractors": "(Name:'Requests', Ver:'1.1')",
                });
            }
        }
    }

    public recordException(dimensions: IStandardMetricBaseDimensions): void {
        this._standardMetricsHandler?.recordException(dimensions);
    }

    public recordTrace(dimensions: IMetricTraceDimensions): void {
        this._standardMetricsHandler?.recordTrace(dimensions);
    }

    public recordSpan(span: ReadableSpan): void {
        this._standardMetricsHandler?.recordSpan(span);
        this._perfCounterMetricsHandler?.recordSpan(span);
    }

    public recordSpanEvents(span: ReadableSpan): void {
        if (span.events) {
            span.events.forEach((event: TimedEvent) => {
                const dimensions: IStandardMetricBaseDimensions = {
                    cloudRoleInstance: "",
                    cloudRoleName: "",
                };
                const serviceName =
                    span.resource?.attributes[SemanticResourceAttributes.SERVICE_NAME];
                const serviceNamespace =
                    span.resource?.attributes[SemanticResourceAttributes.SERVICE_NAMESPACE];
                if (serviceName) {
                    if (serviceNamespace) {
                        dimensions.cloudRoleInstance = `${serviceNamespace}.${serviceName}`;
                    } else {
                        dimensions.cloudRoleName = String(serviceName);
                    }
                }
                if (event.name === "exception") {
                    this._standardMetricsHandler?.recordException(dimensions);
                } else {
                    this._standardMetricsHandler?.recordTrace(dimensions);
                }
            });
        }
    }
}
