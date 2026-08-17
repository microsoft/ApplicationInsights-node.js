// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { shutdownAzureMonitor as distroShutdownAzureMonitor, useAzureMonitor as distroUseAzureMonitor } from "@azure/monitor-opentelemetry";
import { ProxyTracerProvider, diag, metrics, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { InstrumentationConfig } from "@opentelemetry/instrumentation";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { BasicTracerProvider, BatchSpanProcessor, SpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { AutoCollectExceptions } from "./logs/exceptions";
import { AzureMonitorOpenTelemetryOptions } from "./types";
import { ApplicationInsightsConfig } from "./shared/configuration/config";
import { LogApi } from "./shim/logsApi";
import { StatsbeatFeature } from "./shim/types";
import { StatsbeatFeaturesManager } from "./shared/util/statsbeatFeaturesManager";

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
    
    // Add OTLP exporters if configured
    const otlpSpanProcessor = _getOtlpSpanExporter(internalConfig);
    const otlpLogProcessor = _getOtlpLogExporter(internalConfig);
    
    // Ensure options object exists and add processors
    if (!options) {
        options = {};
    }
    
    if (otlpSpanProcessor) {
        if (!options.spanProcessors) {
            options.spanProcessors = [];
        }
        options.spanProcessors.push(otlpSpanProcessor);
    }
    
    if (otlpLogProcessor) {
        if (!options.logRecordProcessors) {
            options.logRecordProcessors = [];
        }
        options.logRecordProcessors.push(otlpLogProcessor);
    }
    
    const consoleOptions = internalConfig.instrumentationOptions.console;
    options.instrumentationOptions = {
        ...options.instrumentationOptions,
        console: {
            enabled: consoleOptions?.enabled,
            logSeverity: consoleOptions?.logSendingLevel,
        } as InstrumentationConfig,
    };

    // Clean up previous instances to prevent listener accumulation on repeated calls
    exceptions?.shutdown();

    distroUseAzureMonitor(options);
    const logApi = new LogApi(logs.getLogger("ApplicationInsightsLogger"));
    if (internalConfig.enableAutoCollectExceptions) {
        exceptions = new AutoCollectExceptions(logApi);
    }
}

/**
* Shutdown Azure Monitor
*/
export async function shutdownAzureMonitor() {
    await distroShutdownAzureMonitor();
    exceptions?.shutdown();
}

/**
 * Try to send all queued telemetry if present.
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

function _getOtlpLogExporter(internalConfig: ApplicationInsightsConfig): BatchLogRecordProcessor {
    if (internalConfig.otlpLogExporterConfig?.enabled) {
        const otlpLogExporter = new OTLPLogExporter(internalConfig.otlpLogExporterConfig);
        const otlpLogProcessor = new BatchLogRecordProcessor({ exporter: otlpLogExporter });
        return otlpLogProcessor;
    }
}
