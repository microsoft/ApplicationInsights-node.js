// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureMonitorOpenTelemetryOptions } from "@azure/monitor-opentelemetry";
import { OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";

/**
 * Azure Monitor OpenTelemetry Options
 */
export interface ApplicationInsightsOptions extends AzureMonitorOpenTelemetryOptions {
    /**
     * Sets the state of exception tracking (enabled by default)
     * if true uncaught exceptions will be sent to Application Insights
     */
    enableAutoCollectExceptions?: boolean;
    /**
     * Log Instrumentations configuration included as part of Application Insights (console, bunyan, winston)
     */
    logInstrumentationOptions?: LogInstrumentationOptions;
    /** OTLP Trace Exporter Configuration */
    otlpTraceExporterConfig?: OTLPExporterConfig;
    /** OTLP Metric Exporter Configuration */
    otlpMetricExporterConfig?: OTLPExporterConfig;
    /** OTLP Log Exporter Configuration */
    otlpLogExporterConfig?: OTLPExporterConfig;
    /**
  * Sets the state of performance tracking (enabled by default)
  * if true performance counters will be collected every second and sent to Azure Monitor
  */
    enableAutoCollectPerformance?: boolean;
    /**
     * Specific extended metrics, applicationinsights-native-metrics package need to be available
     */
    extendedMetrics?: { [type: string]: boolean };
}

/**
 * OTLP Exporter Options
 */
export interface OTLPExporterConfig extends OTLPExporterNodeConfigBase {
    /** Enable/Disable OTLP Exporter */
    enabled?: boolean;
  }

export interface LogInstrumentationOptions {
    console?: { enabled: boolean };
    bunyan?: { enabled: boolean };
    winston?: { enabled: boolean };
}

export const enum ExtendedMetricType {
    gc = "gc",
    heap = "heap",
    loop = "loop",
}
