// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureMonitorOpenTelemetryOptions as DistroOptions, InstrumentationOptions as DistroInstrumentationOptions } from "@azure/monitor-opentelemetry";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { InstrumentationConfig } from "@opentelemetry/instrumentation";
import { OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";


export const APPLICATION_INSIGHTS_OPENTELEMETRY_VERSION = "3.8.0";
export const DEFAULT_ROLE_NAME = "Web";
export const AZURE_MONITOR_STATSBEAT_FEATURES = "AZURE_MONITOR_STATSBEAT_FEATURES";

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
  enableAutoCollectDependencies?: boolean;
  enableAutoCollectRequests?: boolean;
}

export interface InstrumentationOptions extends DistroInstrumentationOptions {
  /** Console Instrumentation Config */
  console?: InstrumentationConfig & { logSendingLevel?: SeverityNumber };
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
