// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { shutdownAzureMonitor, useAzureMonitor } from "@azure/monitor-opentelemetry";
import { ProxyTracerProvider, metrics, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { BasicTracerProvider, BatchSpanProcessor, NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

import { Logger } from "./shared/logging";
import { AutoCollectConsole } from "./logs/console";
import { AutoCollectExceptions } from "./logs/exceptions";
import { ApplicationInsightsOptions } from "./types";
import { ApplicationInsightsConfig } from "./shared/configuration/config";
import { LogApi } from "./logs/api";
import { PerformanceCounterMetrics } from "./metrics/performanceCounters";


export class ApplicationInsightsClient {
    private _internalConfig: ApplicationInsightsConfig;
    private _console: AutoCollectConsole;
    private _exceptions: AutoCollectExceptions;
    private _perfCounters: PerformanceCounterMetrics;
    private _logApi: LogApi;

    /**
     * Constructs a new client
     * @param options ApplicationInsightsOptions
     */
    constructor(options?: ApplicationInsightsOptions) {
        useAzureMonitor(options);
        this._internalConfig = new ApplicationInsightsConfig(options);
        this._logApi = new LogApi(logs.getLogger("ApplicationInsightsLogger"));
        this._console = new AutoCollectConsole(this._logApi);
        if (this._internalConfig.enableAutoCollectExceptions) {
            this._exceptions = new AutoCollectExceptions(this._logApi);
        }
        if (this._internalConfig.enableAutoCollectPerformance) {
            this._perfCounters = new PerformanceCounterMetrics(this._internalConfig);
        }
        this._console.enable(this._internalConfig.logInstrumentationOptions);
        this._addOtlpExporters();
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
        await shutdownAzureMonitor();
        this._console.shutdown();
        this._exceptions?.shutdown();
        this._perfCounters?.shutdown();
    }

    private _addOtlpExporters() {
        if (this._internalConfig.otlpMetricExporterConfig?.enabled) {
            const otlpMetricsExporter = new OTLPMetricExporter(this._internalConfig.otlpMetricExporterConfig);
            const otlpMetricReader = new PeriodicExportingMetricReader({
                exporter: otlpMetricsExporter,
            });
            try {
                (metrics.getMeterProvider() as MeterProvider).addMetricReader(otlpMetricReader);
            }
            catch (err) {
                Logger.getInstance().error("Failed to set OTLP Metric Exporter", err);
            }
        }
        if (this._internalConfig.otlpLogExporterConfig?.enabled) {
            const otlpLogExporter = new OTLPLogExporter(this._internalConfig.otlpLogExporterConfig);
            const otlpLogProcessor = new BatchLogRecordProcessor(otlpLogExporter);
            try {
                (logs.getLoggerProvider() as LoggerProvider).addLogRecordProcessor(otlpLogProcessor);
            }
            catch (err) {
                Logger.getInstance().error("Failed to set OTLP Log Exporter", err);
            }
        }
        if (this._internalConfig.otlpTraceExporterConfig?.enabled) {
            const otlpTraceExporter = new OTLPTraceExporter(this._internalConfig.otlpTraceExporterConfig);
            let otlpSpanProcessor = new BatchSpanProcessor(otlpTraceExporter);
            try {
                ((trace.getTracerProvider() as ProxyTracerProvider).getDelegate() as NodeTracerProvider).addSpanProcessor(otlpSpanProcessor);
            }
            catch (err) {
                Logger.getInstance().error("Failed to set OTLP Trace Exporter", err);
            }
        }
    }
}
