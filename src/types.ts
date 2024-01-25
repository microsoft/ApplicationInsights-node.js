// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureMonitorOpenTelemetryOptions as DistroOptions } from "@azure/monitor-opentelemetry";
import { OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";


export const AZURE_MONITOR_OPENTELEMETRY_VERSION = "1.0.0-beta.10";
export const DEFAULT_ROLE_NAME = "Web";
process.env["AZURE_MONITOR_DISTRO_VERSION"] = AZURE_MONITOR_OPENTELEMETRY_VERSION;

/**
 * Azure Monitor OpenTelemetry Options
 */
export interface AzureMonitorOpenTelemetryOptions extends DistroOptions {
  /**
   * Sets the state of exception tracking (enabled by default)
   * if true uncaught exceptions will be sent to Application Insights
   */
  enableAutoCollectExceptions?: boolean;
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

export interface InstrumentationOptionsType {
  [key: string]: { enabled: boolean }
}

export const enum ExtendedMetricType {
  gc = "gc",
  heap = "heap",
  loop = "loop",
}
