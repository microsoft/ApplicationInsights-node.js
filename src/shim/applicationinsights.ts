import { IncomingMessage } from "http";
import { DiagLogLevel, SpanContext, Context } from "@opentelemetry/api";

import { Logger } from "../shared/logging";
import { ICorrelationContext, HttpRequest } from "./types";
import { TelemetryClient } from "./telemetryClient";
import * as Contracts from "../declarations/contracts";
import { ApplicationInsightsConfig } from "../shared";
import { ExtendedMetricType } from "../shared/configuration/types";
import { CorrelationContextManager } from "./correlationContextManager";

// We export these imports so that SDK users may use these classes directly.
// They're exposed using "export import" so that types are passed along as expected
export { Contracts, HttpRequest, TelemetryClient };

/**
 * The default client, initialized when setup was called. To initialize a different client
 * with its own configuration, use `new TelemetryClient(instrumentationKey?)`.
 */
export let defaultClient: TelemetryClient;
// export let liveMetricsClient: QuickPulseStateManager;

/**
 * Interface which defines which specific extended metrics should be disabled
 *
 * @export
 * @interface IDisabledExtendedMetrics
 */
export interface IDisabledExtendedMetrics {
    [ExtendedMetricType.gc]?: boolean;
    [ExtendedMetricType.heap]?: boolean;
    [ExtendedMetricType.loop]?: boolean;
}

let _setupString: string|undefined;
let _config: ApplicationInsightsConfig;
// TODO: Consider making this static (multiple instances of a context manager doens't make much sense to me)

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
    // Save the setup string and create a config to modify with other functions in this file
    _setupString = setupString;
    if (!_config) {
        _config = new ApplicationInsightsConfig();
        _config.azureMonitorExporterConfig.connectionString = _setupString;
    } else {
        Logger.getInstance().info("Cannot run applicationinsights.setup() more than once.");
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
    if (!defaultClient) {
        // Creates a new TelemetryClient that uses the _config we configure via the other functions in this file
        defaultClient = new TelemetryClient(_config);
    } else {
        Logger.getInstance().info("Cannot run applicationinsights.start() more than once.");
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
    // TODO: Determine what happens if the customer attempts to disable autoDependencyCorrelation
    return CorrelationContextManager.getCurrentContext();
}

/**
 * **(Experimental!)**
 * Starts a fresh context or propagates the current internal one.
 */
export function startOperation(
    arg1: Context | (IncomingMessage | HttpRequest) | SpanContext,
    arg2?: HttpRequest | string
): ICorrelationContext | null {
    // TODO: Implement this
    return null;
}

/**
 * Returns a function that will get the same correlation context within its
 * function body as the code executing this function.
 * Use this method if automatic dependency correlation is not propagating
 * correctly to an asynchronous callback.
 */
export function wrapWithCorrelationContext<T>(fn: T, context?: ICorrelationContext): T {
    // TODO: Implement this
    return null;
}

/**
 * The active configuration for global SDK behaviors, such as auto collection.
 */
export class Configuration {
    // Convenience shortcut to ApplicationInsights.start
    public static start = start;

    /**
     * Sets the state of console and logger tracking (enabled by default for third-party loggers only)
     * @param value if true logger activity will be sent to Application Insights
     * @param collectConsoleLog if true, logger autocollection will include console.log calls (default false)
     * @returns {Configuration} this class
     */
    public static setAutoCollectConsole(value: boolean, collectConsoleLog = false) {
        if (_config) {
            _config.logInstrumentations.bunyan.enabled = value;
            _config.logInstrumentations.winston.enabled = value;
            _config.logInstrumentations.console.enabled = collectConsoleLog;
        }
        return Configuration;
    }

    /**
     * Sets the state of exception tracking (enabled by default)
     * @param value if true uncaught exceptions will be sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectExceptions(value: boolean) {
        if (_config) {
            _config.enableAutoCollectExceptions = value;
        }
        return Configuration;
    }

    /**
     * Sets the state of performance tracking (enabled by default)
     * @param value if true performance counters will be collected every second and sent to Application Insights
     * @param collectExtendedMetrics if true, extended metrics counters will be collected every minute and sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectPerformance(value: boolean, collectExtendedMetrics: any) {
        if (_config) {
            _config.enableAutoCollectPerformance = value;
            if (typeof collectExtendedMetrics === "object") {
                _config.extendedMetrics = { ...collectExtendedMetrics }
            }
            if (collectExtendedMetrics === "boolean") {
                if (!collectExtendedMetrics) {
                    _config.extendedMetrics = {
                        [ExtendedMetricType.gc]: true,
                        [ExtendedMetricType.heap]: true,
                        [ExtendedMetricType.loop]: true
                    }
                }
            }
        }
        return Configuration;
    }

    /**
     * Sets the state of pre aggregated metrics tracking (enabled by default)
     * @param value if true pre aggregated metrics will be collected every minute and sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectPreAggregatedMetrics(value: boolean) {
        if (_config) {
            _config.enableAutoCollectStandardMetrics = value;
        }
        return Configuration;
    }

    /**
     * Sets the state of request tracking (enabled by default)
     * @param value if true HeartBeat metric data will be collected every 15 minutes and sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectHeartbeat(value: boolean) {
        Logger.getInstance().info("Heartbeat is not implemented and this method is a no-op.");
        return Configuration;
    }

    /**
     * Sets the state of request tracking (enabled by default)
     * @param value if true requests will be sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectRequests(value: boolean) {
        // TODO: Implement this
        return Configuration;
    }

    /**
     * Sets the state of dependency tracking (enabled by default)
     * @param value if true dependencies will be sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectDependencies(value: boolean) {
        // TODO: Implement this
        return Configuration;
    }

    /**
     * Sets the state of automatic dependency correlation (enabled by default)
     * @param value if true dependencies will be correlated with requests
     * @param useAsyncHooks if true, forces use of experimental async_hooks module to provide correlation. If false, instead uses only patching-based techniques. If left blank, the best option is chosen for you based on your version of Node.js.
     * @returns {Configuration} this class
     */
    public static setAutoDependencyCorrelation(value: boolean, useAsyncHooks?: boolean) {
        // TODO: Implement this
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

    /**
     * Enables debug and warning Logger for AppInsights itself.
     * @param enableDebugLogger if true, enables debug Logger
     * @param enableWarningLogger if true, enables warning Logger
     * @returns {Configuration} this class
     */
    public static setInternalLogger(enableDebugLogger = false, enableWarningLogger = true) {
        if (enableDebugLogger) {
            Logger.getInstance().updateLogLevel(DiagLogLevel.DEBUG);
            return Configuration;
        }
        if (enableWarningLogger) {
            Logger.getInstance().updateLogLevel(DiagLogLevel.WARN);
            return Configuration;
        }
        // Default
        Logger.getInstance().updateLogLevel(DiagLogLevel.INFO);
        return Configuration;
    }

    /**
     * Enables communication with Application Insights Live Metrics.
     * @param enable if true, enables communication with the live metrics service
     */
    public static setSendLiveMetrics(enable = false) {
        Logger.getInstance().info("Live Metrics is not implemented and this method is a no-op.");
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
