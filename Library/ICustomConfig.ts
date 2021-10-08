/**
 * Configuration settings
 * @export
 * @interface ICustomConfig
 */

import { DistributedTracingModes } from "../applicationinsights";
import { IDisabledExtendedMetrics } from "../AutoCollection/NativePerformance";

export interface ICustomConfig {
    /**
     * Sets the distributed tracing modes. If W3C mode is enabled, W3C trace context
     * headers (traceparent/tracestate) will be parsed in all incoming requests, and included in outgoing
     * requests. In W3C mode, existing back-compatibility AI headers will also be parsed and included.
     * Enabling W3C mode will not break existing correlation with other Application Insights instrumented
     * services. Default=AI
    */
    setDistributedTracingMode?: DistributedTracingModes;

    /**
     * Sets the state of console
     * if true logger activity will be sent to Application Insights
     */
    setAutoCollectConsole?: boolean;

    /**
     * Sets the state of logger tracking (enabled by default for third-party loggers only)
     * if true, logger autocollection will include console.log calls (default false)
     */
    setAutoCollectConsoleLog?: boolean;

    /**
     * Sets the state of exception tracking (enabled by default)
     * if true uncaught exceptions will be sent to Application Insights
     */
    setAutoCollectExceptions?: boolean;

    /**
     * Sets the state of performance tracking (enabled by default)
     * if true performance counters will be collected every second and sent to Application Insights
     * @param collectExtendedMetrics if true, extended metrics counters will be collected every minute and sent to Application Insights
     * @returns {Configuration} this class
     */
    setAutoCollectPerformance?: boolean;

    /**
     * Sets the state of performance tracking (enabled by default)
     * if true, extended metrics counters will be collected every minute and sent to Application Insights
     */
    setAutoCollectExtendedMetrics?: boolean | IDisabledExtendedMetrics;

    /**
     * Sets the state of pre aggregated metrics tracking (enabled by default)
     * if true pre aggregated metrics will be collected every minute and sent to Application Insights
     */
    setAutoCollectPreAggregatedMetrics?: boolean;

    /**
     * Sets the state of request tracking (enabled by default)
     * if true HeartBeat metric data will be collected every 15 mintues and sent to Application Insights
     */
    setAutoCollectHeartbeat?: boolean;

    /**
     * Sets the state of request tracking (enabled by default)
     * if true requests will be sent to Application Insights
     */
    setAutoCollectRequests?: boolean;

    /**
     * Sets the state of dependency tracking (enabled by default)
     * if true dependencies will be sent to Application Insights
     */
    setAutoCollectDependencies?: boolean;

    /**
     * Sets the state of automatic dependency correlation (enabled by default)
     * if true dependencies will be correlated with requests
     */
    setAutoDependencyCorrelation?: boolean;

    /**
     * Sets the state of automatic dependency correlation (enabled by default)
     * if true, forces use of experimental async_hooks module to provide correlation. If false, instead uses only patching-based techniques. If left blank, the best option is chosen for you based on your version of Node.js.
     */
    setUseAsyncHooks?: boolean;

    /**
     * Enable or disable disk-backed retry caching to cache events when client is offline (enabled by default)
     * Note that this method only applies to the default client. Disk-backed retry caching is disabled by default for additional clients.
     * For enable for additional clients, use client.channel.setUseDiskRetryCaching(true).
     * These cached events are stored in your system or user's temporary directory and access restricted to your user when possible.
     * @param setUseDiskRetryCaching if true events that occured while client is offline will be cached on disk
     * @param setResendInterval The wait interval for resending cached events.
     * @param setMaxBytesOnDisk The maximum size (in bytes) that the created temporary directory for cache events can grow to, before caching is disabled.
     */
    setUseDiskRetryCaching?: boolean;
    setResendInterval?: number;
    setMaxBytesOnDisk?: number;

    /**
     * Enables debug and warning logging for AppInsights itself.
     * if true, enables debug logging
     */
    setInternalDebugLogging?: boolean;

    /**
     * Enables debug and warning logging for AppInsights itself.
     * if true, enables warning logging
     */
     setInternalWarningLogging?: boolean;

     /**
     * Enables communication with Application Insights Live Metrics.
     * if true, enables communication with the live metrics service
     */
     setSendLiveMetrics?: boolean;
}