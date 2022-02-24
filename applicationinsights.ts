import { IncomingMessage } from "http";
import { SpanContext } from "@opentelemetry/api";

import { AutoCollectPerformance } from "./AutoCollection/Performance";
import { Logger } from "./Library/Logging/Logger";
import { QuickPulseStateManager } from "./Library/QuickPulse/QuickPulseStateManager";
import { ICorrelationContext, IDisabledExtendedMetrics } from "./Declarations/Interfaces";
import { DistributedTracingModes } from "./Declarations/Enumerators";
import { TelemetryClient } from "./Library/TelemetryClient";
import * as Contracts from "./Declarations/Contracts";
import * as azureFunctionsTypes from "./Declarations/Functions";

// We export these imports so that SDK users may use these classes directly.
// They're exposed using "export import" so that types are passed along as expected
export { Contracts, TelemetryClient, DistributedTracingModes, azureFunctionsTypes };

/**
* The default client, initialized when setup was called. To initialize a different client
* with its own configuration, use `new TelemetryClient(instrumentationKey?)`.
*/
export let defaultClient: TelemetryClient;
export let liveMetricsClient: QuickPulseStateManager;
let _performanceLiveMetrics: AutoCollectPerformance;
let _isSendingLiveMetrics = false;
let _isDiskRetry = true;
let _diskRetryInterval: number = undefined;
let _diskRetryMaxBytes: number = undefined;

/**
 * Initializes the default client. Should be called after setting
 * configuration options.
 *
 * @param setupString the Connection String or Instrumentation Key to use. Optional, if
 * this is not specified, the value will be read from the environment
 * variable APPLICATIONINSIGHTS_CONNECTION_STRING or APPINSIGHTS_INSTRUMENTATIONKEY.
 * @returns {Configuration} the configuration class to initialize
 * and start the SDK.
 */
export function setup(setupString?: string) {
    if (!defaultClient) {
        defaultClient = new TelemetryClient(setupString);
        if (defaultClient.config.distributedTracingMode) {
            Configuration.setDistributedTracingMode(defaultClient.config.distributedTracingMode);
        }
        if (defaultClient.config.enableInternalDebugLogger) {
            Logger.enableDebug = defaultClient.config.enableInternalDebugLogger;
        }
        if (defaultClient.config.enableInternalWarningLogger) {
            Logger.disableWarnings = !defaultClient.config.enableInternalWarningLogger;
        }
        if (defaultClient.config.enableSendLiveMetrics) {
            Configuration.setSendLiveMetrics(defaultClient.config.enableSendLiveMetrics);
        }
        if (defaultClient.config.enableUseDiskRetryCaching) {
            _isDiskRetry = defaultClient.config.enableUseDiskRetryCaching;
        }
        Configuration.setUseDiskRetryCaching(_isDiskRetry, _diskRetryInterval, _diskRetryMaxBytes);
    } else {
        Logger.info("The default client is already setup");
    }
    return Configuration;
}

/**
 * Starts automatic collection of telemetry. Prior to calling start no
 * telemetry will be *automatically* collected, though manual collection
 * is enabled.
 * @returns {ApplicationInsights} this class
 */
export function start() {
    if (defaultClient) {
        defaultClient.traceHandler.start();
        defaultClient.metricHandler.start();
        defaultClient.logHandler.start();
        if (liveMetricsClient && _isSendingLiveMetrics) {
            liveMetricsClient.enable(_isSendingLiveMetrics);
        }
    } else {
        Logger.warn("Start cannot be called before setup");
    }

    return Configuration;
}

/**
 * Returns an object that is shared across all code handling a given request.
 * This can be used similarly to thread-local storage in other languages.
 * Properties set on this object will be available to telemetry processors.
 *
 * Do not store sensitive information here.
 * Custom properties set on this object can be exposed in a future SDK
 * release via outgoing HTTP headers.
 * This is to allow for correlating data cross-component.
 *
 * This method will return null if automatic dependency correlation is disabled.
 * @returns A plain object for request storage or null if automatic dependency correlation is disabled.
 */
export function getCorrelationContext(): ICorrelationContext {
    if (defaultClient) {
        // TODO
        return null;
    }

    return null;
}

/**
 * **(Experimental!)**
 * Starts a fresh context or propagates the current internal one.
 */
export function startOperation(context: SpanContext, name: string): ICorrelationContext | null;
export function startOperation(context: azureFunctionsTypes.Context, request: azureFunctionsTypes.HttpRequest): ICorrelationContext | null;
export function startOperation(context: azureFunctionsTypes.Context, name: string): ICorrelationContext | null;
export function startOperation(context: IncomingMessage | azureFunctionsTypes.HttpRequest, request?: never): ICorrelationContext | null;
export function startOperation(context: azureFunctionsTypes.Context | (IncomingMessage | azureFunctionsTypes.HttpRequest) | (SpanContext), request?: azureFunctionsTypes.HttpRequest | string): ICorrelationContext | null {
    // TODO
    return null;
}

/**
 * Returns a function that will get the same correlation context within its
 * function body as the code executing this function.
 * Use this method if automatic dependency correlation is not propagating
 * correctly to an asynchronous callback.
 */
export function wrapWithCorrelationContext<T extends Function>(fn: T, context?: ICorrelationContext): T {
    // TODO
    return null;
}

/**
 * The active configuration for global SDK behaviors, such as auto collection.
 */
export class Configuration {
    // Convenience shortcut to ApplicationInsights.start
    public static start = start;

    /**
     * Sets the distributed tracing modes. If W3C mode is enabled, W3C trace context
     * headers (traceparent/tracestate) will be parsed in all incoming requests, and included in outgoing
     * requests. In W3C mode, existing back-compatibility AI headers will also be parsed and included.
     * Enabling W3C mode will not break existing correlation with other Application Insights instrumented
     * services. Default=AI
    */
    public static setDistributedTracingMode(value: DistributedTracingModes) {
        // TODO
        return Configuration;
    }

    /**
     * Sets the state of console and logger tracking (enabled by default for third-party loggers only)
     * @param value if true logger activity will be sent to Application Insights
     * @param collectConsoleLog if true, logger autocollection will include console.log calls (default false)
     * @returns {Configuration} this class
     */
    public static setAutoCollectConsole(value: boolean, collectConsoleLog: boolean = false) {
        if (defaultClient) {
            defaultClient.logHandler.setAutoCollectConsole(value, collectConsoleLog);
        }
        return Configuration;
    }

    /**
     * Sets the state of exception tracking (enabled by default)
     * @param value if true uncaught exceptions will be sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectExceptions(value: boolean) {
        if (defaultClient) {
            defaultClient.logHandler.setAutoCollectExceptions(value);
        }
        return Configuration;
    }

    /**
     * Sets the state of performance tracking (enabled by default)
     * @param value if true performance counters will be collected every second and sent to Application Insights
     * @param collectExtendedMetrics if true, extended metrics counters will be collected every minute and sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectPerformance(value: boolean, collectExtendedMetrics: boolean | IDisabledExtendedMetrics = true) {
        if (defaultClient) {
            defaultClient.metricHandler.setAutoCollectPerformance(value, collectExtendedMetrics);
        }
        return Configuration;
    }

    /**
     * Sets the state of pre aggregated metrics tracking (enabled by default)
     * @param value if true pre aggregated metrics will be collected every minute and sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectPreAggregatedMetrics(value: boolean) {
        if (defaultClient) {
            defaultClient.metricHandler.setAutoCollectPreAggregatedMetrics(value);
        }
        return Configuration;
    }

    /**
     * Sets the state of request tracking (enabled by default)
     * @param value if true HeartBeat metric data will be collected every 15 minutes and sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectHeartbeat(value: boolean) {
        if (defaultClient) {
            defaultClient.metricHandler.setAutoCollectHeartbeat(value);
        }
        return Configuration;
    }

    /**
     * Sets the state of request tracking (enabled by default)
     * @param value if true requests will be sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectRequests(value: boolean) {
        // TODO: Remove
        return Configuration;
    }

    /**
     * Sets the state of dependency tracking (enabled by default)
     * @param value if true dependencies will be sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectDependencies(value: boolean) {
        // TODO: Remove
        return Configuration;
    }

    /**
     * Sets the state of automatic dependency correlation (enabled by default)
     * @param value if true dependencies will be correlated with requests
     * @param useAsyncHooks if true, forces use of experimental async_hooks module to provide correlation. If false, instead uses only patching-based techniques. If left blank, the best option is chosen for you based on your version of Node.js.
     * @returns {Configuration} this class
     */
    public static setAutoDependencyCorrelation(value: boolean, useAsyncHooks?: boolean) {
        // TODO: Remove
        return Configuration;
    }

    /**
     * Enable or disable disk-backed retry caching to cache events when client is offline (enabled by default)
     * Note that this method only applies to the default client. Disk-backed retry caching is disabled by default for additional clients.
     * For enable for additional clients, use client.channel.setUseDiskRetryCaching(true).
     * These cached events are stored in your system or user's temporary directory and access restricted to your user when possible.
     * @param value if true events that occured while client is offline will be cached on disk
     * @param resendInterval The wait interval for resending cached events.
     * @param maxBytesOnDisk The maximum size (in bytes) that the created temporary directory for cache events can grow to, before caching is disabled.
     * @returns {Configuration} this class
     */
    public static setUseDiskRetryCaching(value: boolean, resendInterval?: number, maxBytesOnDisk?: number) {
        _isDiskRetry = value;
        _diskRetryInterval = resendInterval;
        _diskRetryMaxBytes = maxBytesOnDisk;
        if (defaultClient && defaultClient.channel) {
            defaultClient.channel.setUseDiskRetryCaching(_isDiskRetry, _diskRetryInterval, _diskRetryMaxBytes);
        }
        return Configuration;
    }

    /**
     * Enables debug and warning Logger for AppInsights itself.
     * @param enableDebugLogger if true, enables debug Logger
     * @param enableWarningLogger if true, enables warning Logger
     * @returns {Configuration} this class
     */
    public static setInternalLogger(enableDebugLogger = false, enableWarningLogger = true) {
        Logger.enableDebug = enableDebugLogger;
        Logger.disableWarnings = !enableWarningLogger;
        return Configuration;
    }

    /**
     * Enables communication with Application Insights Live Metrics.
     * @param enable if true, enables communication with the live metrics service
     */
    public static setSendLiveMetrics(enable = false) {
        if (!defaultClient) {
            // Need a defaultClient so that we can add the QPS telemetry processor to it
            Logger.warn("Live metrics client cannot be setup without the default client");
            return Configuration;
        }

        if (!liveMetricsClient && enable) {
            // No qps client exists. Create one and prepare it to be enabled at .start()
            liveMetricsClient = new QuickPulseStateManager(defaultClient.config, defaultClient.context, defaultClient.getAuthorizationHandler);
            _performanceLiveMetrics = new AutoCollectPerformance(liveMetricsClient as any, 1000, true);
            liveMetricsClient.addCollector(_performanceLiveMetrics);
            defaultClient.quickPulseClient = liveMetricsClient; // Need this so we can forward all manual tracks to live metrics via PerformanceMetricsTelemetryProcessor
        } else if (liveMetricsClient) {
            // qps client already exists; enable/disable it
            liveMetricsClient.enable(enable);
        }
        _isSendingLiveMetrics = enable;
        return Configuration;
    }
}

/**
 * Disposes the default client and all the auto collectors so they can be reinitialized with different configuration
*/
export function dispose() {
    if (defaultClient) {
        defaultClient.traceHandler.dispose();
        defaultClient.metricHandler.dispose();
        defaultClient.logHandler.dispose();
    }
    defaultClient = null;
    if (liveMetricsClient) {
        liveMetricsClient.enable(false);
        _isSendingLiveMetrics = false;
        liveMetricsClient = undefined;
    }
}
