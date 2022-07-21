import { IncomingMessage } from "http";
import { SpanContext } from "@opentelemetry/api";

import { AutoCollectPerformance } from "../autoCollection";
import { Logger } from "../library/logging";
import { IDisabledExtendedMetrics, InstrumentationType } from "../library/configuration/interfaces";
import { QuickPulseStateManager } from "../library/quickPulse";
import { ICorrelationContext } from "../declarations/interfaces";
import { DistributedTracingModes } from "../declarations/enumerators";
import { TelemetryClient } from "./telemetryClient";
import * as Contracts from "../declarations/contracts";
import * as azureFunctionsTypes from "../declarations/functions";


// We export these imports so that SDK users may use these classes directly.
// They're exposed using "export import" so that types are passed along as expected
export { Contracts, TelemetryClient, DistributedTracingModes, azureFunctionsTypes, InstrumentationType };

/**
 * The default client, initialized when setup was called. To initialize a different client
 * with its own configuration, use `new TelemetryClient(instrumentationKey?)`.
 */
export let defaultClient: TelemetryClient;
export let liveMetricsClient: QuickPulseStateManager;
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
        if (defaultClient.config.enableSendLiveMetrics) {
            Configuration.setSendLiveMetrics(defaultClient.config.enableSendLiveMetrics);
        }
        if (defaultClient.config.enableUseDiskRetryCaching) {
            _isDiskRetry = defaultClient.config.enableUseDiskRetryCaching;
        }
        Configuration.setUseDiskRetryCaching(_isDiskRetry, _diskRetryInterval, _diskRetryMaxBytes);
    } else {
        Logger.getInstance().info("The default client is already setup");
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
    return null;
}

/**
 * **(Experimental!)**
 * Starts a fresh context or propagates the current internal one.
 */
export function startOperation(context: SpanContext, name: string): ICorrelationContext | null;
export function startOperation(
    context: azureFunctionsTypes.Context,
    request: azureFunctionsTypes.HttpRequest
): ICorrelationContext | null;
export function startOperation(
    context: azureFunctionsTypes.Context,
    name: string
): ICorrelationContext | null;
export function startOperation(
    context: IncomingMessage | azureFunctionsTypes.HttpRequest,
    request?: never
): ICorrelationContext | null;
export function startOperation(
    context:
        | azureFunctionsTypes.Context
        | (IncomingMessage | azureFunctionsTypes.HttpRequest)
        | SpanContext,
    request?: azureFunctionsTypes.HttpRequest | string
): ICorrelationContext | null {
    return null;
}

/**
 * Returns a function that will get the same correlation context within its
 * function body as the code executing this function.
 * Use this method if automatic dependency correlation is not propagating
 * correctly to an asynchronous callback.
 */
export function wrapWithCorrelationContext<T extends Function>(
    fn: T,
    context?: ICorrelationContext
): T {
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
            defaultClient.client.getLogHandler().setAutoCollectConsole(value, collectConsoleLog);
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
            defaultClient.client.getLogHandler().setAutoCollectExceptions(value);
        }
        return Configuration;
    }

    /**
     * Sets the state of performance tracking (enabled by default)
     * @param value if true performance counters will be collected every second and sent to Application Insights
     * @param collectExtendedMetrics if true, extended metrics counters will be collected every minute and sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectPerformance(
        value: boolean,
        collectExtendedMetrics: boolean | IDisabledExtendedMetrics = true
    ) {
        if (defaultClient) {
            defaultClient.client.getMetricHandler().setAutoCollectPerformance(value, collectExtendedMetrics);
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
            defaultClient.client.getMetricHandler().setAutoCollectPreAggregatedMetrics(value);
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
            defaultClient.client.getMetricHandler().enableAutoCollectHeartbeat();
        }
        return Configuration;
    }

    /**
     * Sets the state of request tracking (enabled by default)
     * @param value if true requests will be sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectRequests(value: boolean) {
        return Configuration;
    }

    /**
     * Sets the state of dependency tracking (enabled by default)
     * @param value if true dependencies will be sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectDependencies(value: boolean) {
        return Configuration;
    }

    /**
     * Sets the state of automatic dependency correlation (enabled by default)
     * @param value if true dependencies will be correlated with requests
     * @param useAsyncHooks if true, forces use of experimental async_hooks module to provide correlation. If false, instead uses only patching-based techniques. If left blank, the best option is chosen for you based on your version of Node.js.
     * @returns {Configuration} this class
     */
    public static setAutoDependencyCorrelation(value: boolean, useAsyncHooks?: boolean) {
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

    public static setUseDiskRetryCaching(
        value: boolean,
        resendInterval?: number,
        maxBytesOnDisk?: number
    ) {
        return Configuration;
    }

    /**
     * Enables debug and warning Logger for AppInsights itself.
     * @param enableDebugLogger if true, enables debug Logger
     * @param enableWarningLogger if true, enables warning Logger
     * @returns {Configuration} this class
     */
    public static setInternalLogger(enableDebugLogger = false, enableWarningLogger = true) {
        Logger.getInstance().enableDebug = enableDebugLogger;
        Logger.getInstance().disableWarnings = !enableWarningLogger;
        return Configuration;
    }

    /**
     * Enables communication with Application Insights Live Metrics.
     * @param enable if true, enables communication with the live metrics service
     */
    public static setSendLiveMetrics(enable = false) {
        return Configuration;
    }
}

/**
 * Disposes the default client and all the auto collectors so they can be reinitialized with different configuration
 */
export function dispose() {
    if (defaultClient) {
        defaultClient.client.shutdown();
    }
    defaultClient = null;
}
