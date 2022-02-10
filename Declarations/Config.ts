// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  DEFAULT_BREEZE_API_VERSION,
  DEFAULT_BREEZE_ENDPOINT,
  ServiceApiVersion,
} from "./Constants";

const DEFAULT_BATCH_SEND_RETRY_INTERVAL_MS = 60_000;
const DEFAULT_MAX_CONSECUTIVE_FAILURES_BEFORE_WARNING = 10;

/**
 * Internal default Azure exporter configuration
 * @internal
 */
export const DEFAULT_EXPORTER_CONFIG: IAzureExporterInternalConfig = {
  instrumentationKey: "",
  endpointUrl: DEFAULT_BREEZE_ENDPOINT,
  batchSendRetryIntervalMs: DEFAULT_BATCH_SEND_RETRY_INTERVAL_MS,
  maxConsecutiveFailuresBeforeWarning: DEFAULT_MAX_CONSECUTIVE_FAILURES_BEFORE_WARNING,
  apiVersion: DEFAULT_BREEZE_API_VERSION,
};

/**
 * Provides configuration options for AzureMonitorTraceExporter.
 */
export interface IAzureExporterConfig {
  /**
   * Azure Monitor Connection String, if not provided the exporter will try to use environment variable APPLICATIONINSIGHTS_CONNECTION_STRING
   * Ex: "InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://dc.services.visualstudio.com"
   */
  connectionString?: string;
  /**
   * Azure service API version.
   */
  apiVersion?: ServiceApiVersion;
}

/**
 * Internal Azure exporter configuration
 * @internal
 */
export interface IAzureExporterInternalConfig {
  instrumentationKey: string;
  batchSendRetryIntervalMs: number;
  maxConsecutiveFailuresBeforeWarning: number;
  endpointUrl: string;
  apiVersion: ServiceApiVersion;
}

