// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureMonitorOpenTelemetryOptions } from "@azure/monitor-opentelemetry";
import { OTLPExporterNodeConfigBase } from '@opentelemetry/otlp-exporter-base';

export interface OTLPExporterConfig {
    baseConfig?: OTLPExporterNodeConfigBase,
    enabled?: boolean
}

/**
 * Azure Monitor OpenTelemetry Options
 */
export interface ApplicationInsightsOptions extends AzureMonitorOpenTelemetryOptions {
    /** OTLP Trace Exporter Configuration */
    otlpTraceExporterConfig?: OTLPExporterConfig;
    /** OTLP Metric Exporter Configuration */
    otlpMetricExporterConfig?: OTLPExporterConfig;
    /**
   * Sets the state of exception tracking (enabled by default)
   * if true uncaught exceptions will be sent to Application Insights
   */
    enableAutoCollectExceptions?: boolean;
    /**
    * Log Instrumentations configuration included as part of Application Insights (console, bunyan, winston)
    */
    logInstrumentations?: LogInstrumentationsConfig;
     /**
     * Specific extended metrics, applicationinsights-native-metrics package need to be available
     */
     extendedMetrics?: { [type: string]: boolean };
}

export interface LogInstrumentationsConfig {
    console?: { enabled: boolean };
    bunyan?: { enabled: boolean };
    winston?: { enabled: boolean };
}

export const enum ExtendedMetricType {
    gc = "gc",
    heap = "heap",
    loop = "loop",
}
