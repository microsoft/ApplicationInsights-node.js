import * as azureCore from "@azure/core-http";
import { InstrumentationConfig } from "@opentelemetry/instrumentation";

export const ENV_AZURE_PREFIX = "APPSETTING_"; // Azure adds this prefix to all environment variables
export const ENV_IKEY = "APPINSIGHTS_INSTRUMENTATIONKEY"; // This key is provided in the readme
export const LEGACY_ENV_IKEY = "APPINSIGHTS_INSTRUMENTATION_KEY";
export const ENV_QUCKPULSE_HOST = "APPINSIGHTS_QUICKPULSE_HOST";

export interface IConfig {
    /** Connection String used to send telemetry payloads to */
    connectionString: string;
    /** The rate of telemetry items tracked that should be transmitted (Default 1.0) */
    samplingRate: number;
    /**
     * Sets the state of exception tracking (enabled by default)
     * if true uncaught exceptions will be sent to Application Insights
     */
    enableAutoCollectExceptions: boolean;
    /**
     * Sets the state of performance tracking (enabled by default)
     * if true performance counters will be collected every second and sent to Application Insights
     */
    enableAutoCollectPerformance: boolean;
    /**
     * Sets the state of standard metrics tracking (enabled by default)
     * if true Standard metrics will be collected every minute and sent to Application Insights
     */
    enableAutoCollectStandardMetrics: boolean;
    /**
     * Sets the state of request tracking (enabled by default)
     * if true HeartBeat metric data will be collected every 15 minutes and sent to Application Insights
     */
    enableAutoCollectHeartbeat: boolean;
    /**
    * Enable automatic incoming request tracking when running in Azure Functions
    */
    enableAutoCollectAzureFunctions: boolean;
    /**
     * OpenTelemetry Instrumentations configuration included as part of Application Insights (azureSdk, http, mongoDb, mySql, postgreSql, redis, redis4)
     */
    instrumentations: InstrumentationsConfig;
    /**
     * Log Instrumentations configuration included as part of Application Insights (console, bunyan, winston)
     */
    logInstrumentations: LogInstrumentationsConfig;
    /**
     * Specific extended metrics, applicationinsights-native-metrics package need to be available
     */
    extendedMetrics: { [type: string]: boolean };
    /**
     * Directory to store retriable telemetry when it fails to export.
     */
    storageDirectory: string;
    /**
     * Disable offline storage when telemetry cannot be exported.
     */
    disableOfflineStorage: boolean;
    /** AAD TokenCredential to use to authenticate the app */
    aadTokenCredential?: azureCore.TokenCredential;
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
