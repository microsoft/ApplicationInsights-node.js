// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { shutdownAzureMonitor as distroShutdownAzureMonitor, useAzureMonitor as distroUseAzureMonitor } from "@azure/monitor-opentelemetry";
import { ProxyTracerProvider, diag, metrics, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { BatchLogRecordProcessor, LoggerProvider, LogRecordProcessor } from "@opentelemetry/sdk-logs";
import { BasicTracerProvider, BatchSpanProcessor, SpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

import { AutoCollectLogs } from "./logs/autoCollectLogs";
import { AutoCollectExceptions } from "./logs/exceptions";
import { AzureMonitorOpenTelemetryOptions } from "./types";
import { ApplicationInsightsConfig } from "./shared/configuration/config";
import { LogApi } from "./shim/logsApi";
import { StatsbeatFeature } from "./shim/types";
import { RequestSpanProcessor } from "./traces/requestProcessor";
import { StatsbeatFeaturesManager } from "./shared/util/statsbeatFeaturesManager";

let autoCollectLogs: AutoCollectLogs;
let exceptions: AutoCollectExceptions;

/**
 * Initialize Azure Monitor
 * @param options Configuration
 */
export function useAzureMonitor(options?: AzureMonitorOpenTelemetryOptions) {
    // Initialize statsbeat features with default values and enable SHIM feature
    StatsbeatFeaturesManager.getInstance().initialize();
    StatsbeatFeaturesManager.getInstance().enableFeature(StatsbeatFeature.SHIM);
    
    // Allows for full filtering of dependency/request spans
const internalConfig = new ApplicationInsightsConfig(options);
    options.spanProcessors = [
        _getOtlpSpanExporter(internalConfig),
        new RequestSpanProcessor(options.enableAutoCollectDependencies, options.enableAutoCollectRequests)
    ];
    options.logRecordProcessors = [
        _getOtlpLogExporter(internalConfig)
    ];
    distroUseAzureMonitor(options);
    const logApi = new LogApi(logs.getLogger("ApplicationInsightsLogger"));
    autoCollectLogs = new AutoCollectLogs();
    if (internalConfig.enableAutoCollectExceptions) {
        exceptions = new AutoCollectExceptions(logApi);
    }
    autoCollectLogs.enable(internalConfig.instrumentationOptions);
}

/**
* Shutdown Azure Monitor
*/
export async function shutdownAzureMonitor() {
    await distroShutdownAzureMonitor();
    autoCollectLogs.shutdown();
    exceptions?.shutdown();
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

function _getOtlpSpanExporter(internalConfig: ApplicationInsightsConfig): SpanProcessor {
    if (internalConfig.otlpTraceExporterConfig?.enabled) {
        const otlpTraceExporter = new OTLPTraceExporter(internalConfig.otlpTraceExporterConfig);
        const otlpSpanProcessor = new BatchSpanProcessor(otlpTraceExporter);
        return otlpSpanProcessor;
    }
}

function _getOtlpLogExporter(internalConfig: ApplicationInsightsConfig): any {
    if (internalConfig.otlpLogExporterConfig?.enabled) {
        const otlpLogExporter = new OTLPLogExporter(internalConfig.otlpLogExporterConfig);
        const otlpLogProcessor = new BatchLogRecordProcessor(otlpLogExporter);
        return otlpLogProcessor;
    }
}
