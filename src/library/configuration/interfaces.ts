import * as azureCore from "@azure/core-http";

export interface IBaseConfig {
    /** The ingestion endpoint to send telemetry payloads to */
    endpointUrl: string;
    /** The percentage of telemetry items tracked that should be transmitted (Default 100) */
    samplingPercentage: number;
    /**
     * Sets the state of console
     * if true logger activity will be sent to Application Insights
     */
    enableAutoCollectExternalLoggers: boolean;
    /**
     * Sets the state of logger tracking (enabled by default for third-party loggers only)
     * if true, logger autocollection will include console.log calls (default false)
     */
    enableAutoCollectConsole: boolean;
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
     * Sets the state of performance tracking (enabled by default)
     * if true, extended metrics counters will be collected every minute and sent to Application Insights
     */
    enableAutoCollectExtendedMetrics: boolean | IDisabledExtendedMetrics;
    /**
     * Sets the state of pre aggregated metrics tracking (enabled by default)
     * if true pre aggregated metrics will be collected every minute and sent to Application Insights
     */
    enableAutoCollectPreAggregatedMetrics: boolean;
    /**
     * Sets the state of request tracking (enabled by default)
     * if true HeartBeat metric data will be collected every 15 minutes and sent to Application Insights
     */
    enableAutoCollectHeartbeat: boolean;
    /**
     * Sets the state of request tracking (enabled by default)
     * if true requests will be sent to Application Insights
     */
    enableAutoCollectRequests: boolean;
    /**
     * Sets the state of dependency tracking (enabled by default)
     * if true dependencies will be sent to Application Insights
     */
    enableAutoCollectDependencies: boolean;
    /**
     * Enables communication with Application Insights Live Metrics.
     * if true, enables communication with the live metrics service
     */
    enableSendLiveMetrics: boolean;
    /**
     * Disable all environment variables set
     */
    disableAllExtendedMetrics: boolean;
    /**
     * Disable individual environment variables set. eg. "extendedMetricDisablers": "..."
     */
    extendedMetricDisablers: string;
    /**
     * Disable Statsbeat
     */
    disableStatsbeat: boolean;
    /**
     * Live Metrics custom host
     */
    quickPulseHost: string;

    instrumentations: { [type: string]: iInstrumentation };
}

export interface iInstrumentation {
    enabled: boolean
}

export const enum InstrumentationType {
    azureSdk = "azureSdk",
    mongoDb = "mongoDb",
    mySql = "mySql",
    postgreSql = "postgreSql",
    redis = "redis",
    redis4 = "redis4"
}

export interface IEnvironmentConfig {
    /** Connection String used to send telemetry payloads to */
    connectionString: string;
}

export interface IJsonConfig extends IBaseConfig, IEnvironmentConfig { }

export interface IConfig extends IBaseConfig {
    /** AAD TokenCredential to use to authenticate the app */
    aadTokenCredential?: azureCore.TokenCredential;
}

/**
 * Interface which defines which specific extended metrics should be disabled
 *
 * @export
 * @interface IDisabledExtendedMetrics
 */
export interface IDisabledExtendedMetrics {
    gc?: boolean;
    heap?: boolean;
    loop?: boolean;
}