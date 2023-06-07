// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogRecord } from "@opentelemetry/sdk-logs";
import { ReadableSpan, Span } from "@opentelemetry/sdk-trace-base";
import { ApplicationInsightsConfig } from "../shared";
import {
    CustomMetricsHandler,
    HeartBeatHandler,
    StandardMetricsHandler,
    PerformanceCounterMetricsHandler,
} from "./handlers";


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

    /** 
   * @deprecated This should not be used
   */
    public getConfig(): ApplicationInsightsConfig {
        return this._config;
    }

    public getCustomMetricsHandler(): CustomMetricsHandler {
        return this._customMetricsHandler;
    }

    public markSpanAsProcceseded(span: Span): void {
        this._standardMetricsHandler?.markSpanAsProcceseded(span);
    }

    public markLogsAsProcceseded(logRecord: LogRecord): void {
        this._standardMetricsHandler?.markLogsAsProcceseded(logRecord);
    }

    public recordSpan(span: ReadableSpan): void {
        this._standardMetricsHandler?.recordSpan(span);
        this._perfCounterMetricsHandler?.recordSpan(span);
    }

    public recordSpanEvents(span: ReadableSpan): void {
        this._standardMetricsHandler?.recordSpanEvents(span);
    }

    public recordLog(logRecord: LogRecord): void {
        this._standardMetricsHandler?.recordLog(logRecord);
    }
}
