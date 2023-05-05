import { TokenCredential } from "@azure/core-auth";
import { AzureMonitorExporterOptions } from "@azure/monitor-opentelemetry-exporter";
import { InstrumentationConfig } from "@opentelemetry/instrumentation";
import { Resource } from "@opentelemetry/resources";

export const ENV_AZURE_PREFIX = "APPSETTING_"; // Azure adds this prefix to all environment variables
export const ENV_IKEY = "APPINSIGHTS_INSTRUMENTATIONKEY"; // This key is provided in the readme
export const LEGACY_ENV_IKEY = "APPINSIGHTS_INSTRUMENTATION_KEY";
export const ENV_QUCKPULSE_HOST = "APPINSIGHTS_QUICKPULSE_HOST";

export interface IConfig {
    /** Azure Monitor Exporter Configuration */
    azureMonitorExporterConfig?: AzureMonitorExporterOptions;
    /** The rate of telemetry items tracked that should be transmitted (Default 1.0) */
    samplingRatio?: number;
    /**
     * Sets the state of exception tracking (enabled by default)
     * if true uncaught exceptions will be sent to Application Insights
     */
    enableAutoCollectExceptions?: boolean;
    /**
     * Sets the state of performance tracking (enabled by default)
     * if true performance counters will be collected every second and sent to Application Insights
     */
    enableAutoCollectPerformance?: boolean;
    /**
     * Sets the state of standard metrics tracking (enabled by default)
     * if true Standard metrics will be collected every minute and sent to Application Insights
     */
    enableAutoCollectStandardMetrics?: boolean;
    /**
     * Sets the state of request tracking (enabled by default)
     * if true HeartBeat metric data will be collected every 15 minutes and sent to Application Insights
     */
    enableAutoCollectHeartbeat?: boolean;
    /**
     * OpenTelemetry Instrumentations configuration included as part of Application Insights (azureSdk, http, mongoDb, mySql, postgreSql, redis, redis4)
     */
    instrumentations?: InstrumentationsConfig;
    /**
     * Log Instrumentations configuration included as part of Application Insights (console, bunyan, winston)
     */
    logInstrumentations?: LogInstrumentationsConfig;
    /**
     * Specific extended metrics, applicationinsights-native-metrics package need to be available
     */
    extendedMetrics?: { [type: string]: boolean };
    /** OpenTelemetry Resource */
    resource?: Resource;
    /**
     * Directory to store retriable telemetry when it fails to export.
      * @deprecated This config should not be used, use azureMonitorExporterConfig to configure storageDirectory
     */
    storageDirectory?: string;
    /**
     * Disable offline storage when telemetry cannot be exported.
      * @deprecated This config should not be used, use azureMonitorExporterConfig to configure disableOfflineStorage
     */
    disableOfflineStorage?: boolean;
    /** Connection String used to send telemetry payloads to 
    * @deprecated This config should not be used, use azureMonitorExporterConfig to configure Connection String
   */
    connectionString?: string;

    /** AAD TokenCredential to use to authenticate the app 
   * @deprecated This config should not be used, use azureMonitorExporterConfig to configure aadTokenCredential
   */
    aadTokenCredential?: TokenCredential;
}

export interface InstrumentationsConfig {
    azureSdk?: InstrumentationConfig;
    http?: InstrumentationConfig;
    mongoDb?: InstrumentationConfig;
    mySql?: InstrumentationConfig;
    postgreSql?: InstrumentationConfig;
    redis?: InstrumentationConfig;
    redis4?: InstrumentationConfig;
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
