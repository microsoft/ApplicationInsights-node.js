/**
 * Configuration settings
 * @export
 * @interface ICustomConfig
 */

import { DistributedTracingModes } from "../applicationinsights";
import { IDisabledExtendedMetrics } from "../AutoCollection/NativePerformance";
import http = require('http');
import https = require('https');
export interface ICustomConfig {
    connectionString?: string;

    /** An identifier for your Application Insights resource */
    instrumentationKey: string;
    /** The id for cross-component correlation. READ ONLY. */
    correlationId: string;
    /** The ingestion endpoint to send telemetry payloads to */
    endpointUrl: string;
    /** The maximum number of telemetry items to include in a payload to the ingestion endpoint (Default 250) */
    maxBatchSize: number;
    /** The maximum amount of time to wait for a payload to reach maxBatchSize (Default 15000) */
    maxBatchIntervalMs: number;
    /** A flag indicating if telemetry transmission is disabled (Default false) */
    disableAppInsights: boolean;
    /** The percentage of telemetry items tracked that should be transmitted (Default 100) */
    samplingPercentage: number;
    /** The time to wait before retrying to retrieve the id for cross-component correlation (Default 30000) */
    correlationIdRetryIntervalMs: number;
    /** A list of domains to exclude from cross-component header injection */
    correlationHeaderExcludedDomains: string[];
    /** A proxy server for SDK HTTP traffic (Optional, Default pulled from `http_proxy` environment variable) */
    proxyHttpUrl: string;
    /** A proxy server for SDK HTTPS traffic (Optional, Default pulled from `https_proxy` environment variable) */
    proxyHttpsUrl: string;
    /** An http.Agent to use for SDK HTTP traffic (Optional, Default undefined) */
    httpAgent: http.Agent;
    /** An https.Agent to use for SDK HTTPS traffic (Optional, Default undefined) */
    httpsAgent: https.Agent;
    /** Disable including legacy headers in outgoing requests, x-ms-request-id */
    ignoreLegacyHeaders?: boolean;
    /**
     * Sets the distributed tracing modes. If W3C mode is enabled, W3C trace context
     * headers (traceparent/tracestate) will be parsed in all incoming requests, and included in outgoing
     * requests. In W3C mode, existing back-compatibility AI headers will also be parsed and included.
     * Enabling W3C mode will not break existing correlation with other Application Insights instrumented
     * services. Default=AI
    */
    enableDistributedTracingMode?: DistributedTracingModes;

    /**
     * Sets the state of console
     * if true logger activity will be sent to Application Insights
     */
    enableAutoCollectConsole?: boolean;

    /**
     * Sets the state of logger tracking (enabled by default for third-party loggers only)
     * if true, logger autocollection will include console.log calls (default false)
     */
    enableAutoCollectConsoleLog?: boolean;

    /**
     * Sets the state of exception tracking (enabled by default)
     * if true uncaught exceptions will be sent to Application Insights
     */
    enableAutoCollectExceptions?: boolean;

    /**
     * Sets the state of performance tracking (enabled by default)
     * if true performance counters will be collected every second and sent to Application Insights
     * @param collectExtendedMetrics if true, extended metrics counters will be collected every minute and sent to Application Insights
     * @returns {Configuration} this class
     */
    enableAutoCollectPerformance?: boolean;

    /**
     * Sets the state of performance tracking (enabled by default)
     * if true, extended metrics counters will be collected every minute and sent to Application Insights
     */
    enableAutoCollectExtendedMetrics?: boolean | IDisabledExtendedMetrics;

    /**
     * Sets the state of pre aggregated metrics tracking (enabled by default)
     * if true pre aggregated metrics will be collected every minute and sent to Application Insights
     */
    enableAutoCollectPreAggregatedMetrics?: boolean;

    /**
     * Sets the state of request tracking (enabled by default)
     * if true HeartBeat metric data will be collected every 15 mintues and sent to Application Insights
     */
    enableAutoCollectHeartbeat?: boolean;

    /**
     * Sets the state of request tracking (enabled by default)
     * if true requests will be sent to Application Insights
     */
    enableAutoCollectRequests?: boolean;

    /**
     * Sets the state of dependency tracking (enabled by default)
     * if true dependencies will be sent to Application Insights
     */
    enableAutoCollectDependencies?: boolean;

    /**
     * Sets the state of automatic dependency correlation (enabled by default)
     * if true dependencies will be correlated with requests
     */
    enableAutoDependencyCorrelation?: boolean;

    /**
     * Sets the state of automatic dependency correlation (enabled by default)
     * if true, forces use of experimental async_hooks module to provide correlation. If false, instead uses only patching-based techniques. If left blank, the best option is chosen for you based on your version of Node.js.
     */
    enableUseAsyncHooks?: boolean;

    /**
     * Enable or disable disk-backed retry caching to cache events when client is offline (enabled by default)
     * Note that this method only applies to the default client. Disk-backed retry caching is disabled by default for additional clients.
     * For enable for additional clients, use client.channel.setUseDiskRetryCaching(true).
     * These cached events are stored in your system or user's temporary directory and access restricted to your user when possible.
     * @param enableUseDiskRetryCaching if true events that occured while client is offline will be cached on disk
     * @param enableResendInterval The wait interval for resending cached events.
     * @param enableMaxBytesOnDisk The maximum size (in bytes) that the created temporary directory for cache events can grow to, before caching is disabled.
     */
    enableUseDiskRetryCaching?: boolean;
    enableResendInterval?: number;
    enableMaxBytesOnDisk?: number;

    /**
     * Enables debug and warning logging for AppInsights itself.
     * if true, enables debug logging
     */
    enableInternalDebugLogging?: boolean;

    /**
     * Enables debug and warning logging for AppInsights itself.
     * if true, enables warning logging
     */
    enableInternalWarningLogging?: boolean;

     /**
     * Enables communication with Application Insights Live Metrics.
     * if true, enables communication with the live metrics service
     */
    enableSendLiveMetrics?: boolean;

    disableAllExtendedMetrics?: boolean;
    extendedMetricDisablers?: string;

    disableStatsbeat?: boolean;
}