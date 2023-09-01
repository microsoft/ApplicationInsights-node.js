// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { metrics, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { LoggerProvider } from "@opentelemetry/sdk-logs";
import { BasicTracerProvider } from "@opentelemetry/sdk-trace-node";

import { Logger } from "./shared/logging";
import { AutoCollectConsole } from "./logs/console";
import { AutoCollectExceptions } from "./logs/exceptions";
import { AZURE_MONITOR_STATSBEAT_FEATURES, ApplicationInsightsOptions, StatsbeatFeature, StatsbeatInstrumentation } from "./types";
import { ApplicationInsightsConfig } from "./shared/configuration/config";
import { LogApi } from "./logs/api";
import { MetricHandler } from "./metrics/handler";
import { TraceHandler } from "./traces/handler";
import { LogHandler } from "./logs/handler";
import { PerformanceCounterMetrics } from "./metrics/performanceCounters";


export class ApplicationInsightsClient {
    private _internalConfig: ApplicationInsightsConfig;
    private _console: AutoCollectConsole;
    private _exceptions: AutoCollectExceptions;
    private _perfCounters: PerformanceCounterMetrics;
    private _logApi: LogApi;
    private _metricHandler: MetricHandler;
    private _traceHandler: TraceHandler;
    private _logHandler: LogHandler;

    /**
     * Constructs a new client
     * @param options ApplicationInsightsOptions
     */
    constructor(options?: ApplicationInsightsOptions) {
        // Create internal handlers
        this._internalConfig = new ApplicationInsightsConfig(options);
        this._setStatsbeatFeatures(this._internalConfig);
        this._metricHandler = new MetricHandler(this._internalConfig);
        this._traceHandler = new TraceHandler(this._internalConfig, this._metricHandler);
        this._logHandler = new LogHandler(this._internalConfig, this._metricHandler);


        this._logApi = new LogApi(logs.getLogger("ApplicationInsightsLogger"));

        this._console = new AutoCollectConsole(this._logApi);
        if (this._internalConfig.enableAutoCollectExceptions) {
            this._exceptions = new AutoCollectExceptions(this._logApi);
        }
        if (this._internalConfig.enableAutoCollectPerformance) {
            this._perfCounters = new PerformanceCounterMetrics(this._internalConfig);
        }
        this._console.enable(this._internalConfig.logInstrumentationOptions);
    }

    /**
   *Try to send all queued telemetry if present.
   */
    public async flush(): Promise<void> {
        try {
            await (metrics.getMeterProvider() as MeterProvider).forceFlush();
            await (trace.getTracerProvider() as BasicTracerProvider).forceFlush();
            await (logs.getLoggerProvider() as LoggerProvider).forceFlush();
        } catch (err) {
            Logger.getInstance().error("Failed to flush telemetry", err);
        }
    }

    /**
     * Shutdown client
     */
    public async shutdown(): Promise<void> {
        this._metricHandler.shutdown();
        this._traceHandler.shutdown();
        this._logHandler.shutdown();

        this._console.shutdown();
        this._exceptions?.shutdown();
        this._perfCounters?.shutdown();
    }

    private _setStatsbeatFeatures(config: ApplicationInsightsConfig) {
        let instrumentationBitMap = 0;
        if (config.instrumentationOptions?.azureSdk?.enabled) {
            instrumentationBitMap |= StatsbeatInstrumentation.AZURE_CORE_TRACING;
        }
        if (config.instrumentationOptions?.mongoDb?.enabled) {
            instrumentationBitMap |= StatsbeatInstrumentation.MONGODB;
        }
        if (config.instrumentationOptions?.mySql?.enabled) {
            instrumentationBitMap |= StatsbeatInstrumentation.MYSQL;
        }
        if (config.instrumentationOptions?.postgreSql?.enabled) {
            instrumentationBitMap |= StatsbeatInstrumentation.POSTGRES;
        }
        if (config.instrumentationOptions?.redis?.enabled) {
            instrumentationBitMap |= StatsbeatInstrumentation.REDIS;
        }

        let featureBitMap = 0;
        featureBitMap |= StatsbeatFeature.DISTRO;

        try {
            process.env[AZURE_MONITOR_STATSBEAT_FEATURES] = JSON.stringify({
                instrumentation: instrumentationBitMap,
                feature: featureBitMap,
            });
        } catch (error) {
            Logger.getInstance().error("Failed call to JSON.stringify.", error);
        }
    }

}
