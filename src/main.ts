// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { shutdownAzureMonitor as distroShutdownAzureMonitor, useAzureMonitor as distroUseAzureMonitor } from "@azure/monitor-opentelemetry";
import { ProxyTracerProvider, diag, metrics, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { BasicTracerProvider, BatchSpanProcessor, NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

import { AutoCollectLogs } from "./logs/autoCollectLogs";
import { AutoCollectExceptions } from "./logs/exceptions";
import { AZURE_MONITOR_STATSBEAT_FEATURES, AzureMonitorOpenTelemetryOptions } from "./types";
import { ApplicationInsightsConfig } from "./shared/configuration/config";
import { LogApi } from "./shim/logsApi";
import { PerformanceCounterMetrics } from "./metrics/performanceCounters";
import { AzureMonitorSpanProcessor } from "./traces/spanProcessor";
import { StatsbeatFeature, StatsbeatInstrumentation } from "./shim/types";

let autoCollectLogs: AutoCollectLogs;
let exceptions: AutoCollectExceptions;
let perfCounters: PerformanceCounterMetrics;

/**
 * Initialize Azure Monitor
 * @param options Configuration
 */
export function useAzureMonitor(options?: AzureMonitorOpenTelemetryOptions) {
    // Must set statsbeat features before they are read by the distro
    process.env[AZURE_MONITOR_STATSBEAT_FEATURES] = JSON.stringify({
        instrumentation: StatsbeatInstrumentation.NONE,
        feature: StatsbeatFeature.SHIM
    });
    distroUseAzureMonitor(options);
    const internalConfig = new ApplicationInsightsConfig(options);
    const logApi = new LogApi(logs.getLogger("ApplicationInsightsLogger"));
    autoCollectLogs = new AutoCollectLogs();
    if (internalConfig.enableAutoCollectExceptions) {
        exceptions = new AutoCollectExceptions(logApi);
    }
    if (internalConfig.enableAutoCollectPerformance) {
        try {
            perfCounters = new PerformanceCounterMetrics(internalConfig);
            // Add SpanProcessor to calculate Request Metrics
            if (typeof (trace.getTracerProvider() as BasicTracerProvider).addSpanProcessor === "function") {
                (trace.getTracerProvider() as BasicTracerProvider).addSpanProcessor(new AzureMonitorSpanProcessor(perfCounters));
            }
        } catch (err) {
            diag.error("Failed to initialize PerformanceCounterMetrics: ", err);
        }
    }
    autoCollectLogs.enable(internalConfig.instrumentationOptions);
    _addOtlpExporters(internalConfig);
}

/**
* Shutdown Azure Monitor
*/
export async function shutdownAzureMonitor() {
    await distroShutdownAzureMonitor();
    autoCollectLogs.shutdown();
    exceptions?.shutdown();
    perfCounters?.shutdown();
}

/**
 *Try to send all queued telemetry if present.
 */
export async function flushAzureMonitor() {
    try {
        await (metrics.getMeterProvider() as MeterProvider).forceFlush();
        await (((trace.getTracerProvider() as ProxyTracerProvider).getDelegate()) as BasicTracerProvider).forceFlush();
        await (logs.getLoggerProvider() as LoggerProvider).forceFlush();
    } catch (err) {
        diag.error("Failed to flush telemetry", err);
    }
}

function _addOtlpExporters(internalConfig: ApplicationInsightsConfig) {
    if (internalConfig.otlpMetricExporterConfig?.enabled) {
        const otlpMetricsExporter = new OTLPMetricExporter(internalConfig.otlpMetricExporterConfig);
        const otlpMetricReader = new PeriodicExportingMetricReader({
            exporter: otlpMetricsExporter,
        });
        try {
            (metrics.getMeterProvider() as MeterProvider).addMetricReader(otlpMetricReader);
        }
        catch (err) {
            diag.error("Failed to set OTLP Metric Exporter", err);
        }
    }
    if (internalConfig.otlpLogExporterConfig?.enabled) {
        const otlpLogExporter = new OTLPLogExporter(internalConfig.otlpLogExporterConfig);
        const otlpLogProcessor = new BatchLogRecordProcessor(otlpLogExporter);
        try {
            (logs.getLoggerProvider() as LoggerProvider).addLogRecordProcessor(otlpLogProcessor);
        }
        catch (err) {
            diag.error("Failed to set OTLP Log Exporter", err);
        }
    }
    if (internalConfig.otlpTraceExporterConfig?.enabled) {
        const otlpTraceExporter = new OTLPTraceExporter(internalConfig.otlpTraceExporterConfig);
        const otlpSpanProcessor = new BatchSpanProcessor(otlpTraceExporter);
        try {
            ((trace.getTracerProvider() as ProxyTracerProvider).getDelegate() as NodeTracerProvider).addSpanProcessor(otlpSpanProcessor);
        }
        catch (err) {
            diag.error("Failed to set OTLP Trace Exporter", err);
        }
    }
}
