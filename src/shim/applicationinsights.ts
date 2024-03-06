// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as http from "http";
import * as azureFunctionsTypes from "@azure/functions";
import { DiagConsoleLogger, SpanContext, diag } from "@opentelemetry/api";
import { Span } from "@opentelemetry/sdk-trace-base";
import { CorrelationContextManager } from "./correlationContextManager";
import { ICorrelationContext, HttpRequest, DistributedTracingModes } from "./types";
import { TelemetryClient } from "./telemetryClient";
import * as Contracts from "../declarations/contracts";
import { Util } from "../shared/util";

// We export these imports so that SDK users may use these classes directly.
// They're exposed using "export import" so that types are passed along as expected
export { Contracts, DistributedTracingModes, HttpRequest, TelemetryClient };

/**
 * The default client, initialized when setup was called. To initialize a different client
 * with its own configuration, use `new TelemetryClient(instrumentationKey?)`.
 */
export let defaultClient: TelemetryClient;

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
    } else {
        defaultClient.configWarnings.push("Setup has already been called once. To set up a new client, please use TelemetryClient instead.")
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
    try {
        if (!defaultClient) {
            diag.setLogger(new DiagConsoleLogger());
            diag.warn("Start cannot be called before setup. Please call setup() first.");
        } else {
            defaultClient.initialize();
        }
        return Configuration;
    } catch (error) {
        diag.warn(`Failed to start default client: ${Util.getInstance().dumpObj(error)}`);
    }
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
    return CorrelationContextManager.getCurrentContext();
}

/**
 * **(Experimental!)**
 * Starts a fresh context or propagates the current internal one.
 */
export function startOperation(
    arg1: azureFunctionsTypes.Context | (http.IncomingMessage | azureFunctionsTypes.HttpRequest) | SpanContext | Span,
    arg2?: HttpRequest | string
): ICorrelationContext | null {
    return CorrelationContextManager.startOperation(arg1, arg2);
}

/**
 * Returns a function that will get the same correlation context within its
 * function body as the code executing this function.
 * Use this method if automatic dependency correlation is not propagating
 * correctly to an asynchronous callback.
 */
export function wrapWithCorrelationContext<T>(fn: T, context?: ICorrelationContext): T {
    return CorrelationContextManager.wrapCallback<T>(fn, context);
}

/**
 * The active configuration for global SDK behaviors, such as auto collection.
 */
export class Configuration {
    // Convenience shortcut to ApplicationInsights.start
    public static start = start;

    /**
     * Only W3C traing mode is currently suppported so this method informs the user if they attempt to set the value.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public static setDistributedTracingMode(value: number) {
        if (defaultClient) {
            defaultClient.config.distributedTracingMode = value;
        }
        return Configuration;
    }

    /**
     * Sets the state of console and logger tracking (enabled by default for third-party loggers only)
     * @param value if true logger activity will be sent to Application Insights
     * @param collectConsoleLog if true, logger autocollection will include console.log calls (default false)
     * @returns {Configuration} this class
     */
    public static setAutoCollectConsole(value: boolean, collectConsoleLog = false) {
        if (defaultClient) {
            defaultClient.config.enableAutoCollectExternalLoggers = value;
            defaultClient.config.enableAutoCollectConsole = collectConsoleLog;
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
            defaultClient.config.enableAutoCollectExceptions = value;
        }
        return Configuration;
    }

    /**
     * Sets the state of performance tracking (enabled by default)
     * @param value if true performance counters will be collected every second and sent to Application Insights
     * @param collectExtendedMetrics if true, extended metrics counters will be collected every minute and sent to Application Insights
     * @returns {Configuration} this class
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars 
    public static setAutoCollectPerformance(value: boolean, collectExtendedMetrics: any) {
        if (defaultClient) {
            defaultClient.config.enableAutoCollectPerformance = value;
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
            defaultClient.config.enableAutoCollectPreAggregatedMetrics = value;
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
            defaultClient.config.enableAutoCollectHeartbeat = value;
        }
        return Configuration;
    }

    /**
     * Sets the state of Web snippet injection
     * @param value if true Web snippet will try to be injected in server response
     * @param WebSnippetConnectionString if provided, Web snippet injection will use this ConnectionString. Default to use the connectionString in Node.js app initialization.
     * @returns {Configuration} this class
     */
    public static enableWebInstrumentation(value: boolean, WebSnippetConnectionString?: string) {
        if (defaultClient) {
            defaultClient.config.enableWebInstrumentation = value;
            defaultClient.config.webInstrumentationConnectionString = WebSnippetConnectionString;
        }
        return Configuration;
    }

    /**
     * Sets the state of request tracking (enabled by default)
     * @param value if true requests will be sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectRequests(value: boolean) {
        if (defaultClient) {
            defaultClient.config.enableAutoCollectRequests = value;
        }
        return Configuration;
    }

    /**
     * Sets the state of dependency tracking (enabled by default)
     * @param value if true dependencies will be sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectDependencies(value: boolean) {
        if (defaultClient) {
            defaultClient.config.enableAutoCollectDependencies = value;
        }
        return Configuration;
    }

    /**
     * Sets the state of automatic dependency correlation (enabled by default)
     * @param value if true dependencies will be correlated with requests
     * @param useAsyncHooks if true, forces use of experimental async_hooks module to provide correlation. If false, instead uses only patching-based techniques. If left blank, the best option is chosen for you based on your version of Node.js.
     * @returns {Configuration} this class
     */
    public static setAutoDependencyCorrelation(value: boolean, useAsyncHooks?: boolean) {
        if (defaultClient) {
            defaultClient.config.enableAutoDependencyCorrelation = value;
            defaultClient.config.enableUseAsyncHooks = useAsyncHooks;
        }
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
        if (defaultClient) {
            defaultClient.config.enableUseDiskRetryCaching = value;
            defaultClient.config.enableResendInterval = resendInterval;
            defaultClient.config.enableMaxBytesOnDisk = maxBytesOnDisk;
        }
        return Configuration;
    }

    /**
     * Enables debug and warning Logger for AppInsights itself.
     * @param enableDebugLogger if true, enables debug Logger
     * @param enableWarningLogger if true, enables warning Logger
     * @returns {Configuration} this class
     */
    public static setInternalLogging(enableDebugLogger = false, enableWarningLogger = true) {
        if (defaultClient) {
            defaultClient.config.enableInternalDebugLogging = enableDebugLogger;
            defaultClient.config.enableInternalWarningLogging = enableWarningLogger;
        }
        return Configuration;
    }

    /**
     * Enable automatic incoming request tracking when using Azure Functions
     * @param value if true auto collection of incoming requests will be enabled
     * @returns {Configuration} this class
     */
    public static setAutoCollectIncomingRequestAzureFunctions(value: boolean) {
        if (defaultClient) {
            defaultClient.config.enableAutoCollectIncomingRequestAzureFunctions = value;
        }
        return Configuration;
    }

    /**
     * Enables communication with Application Insights Live Metrics.
     * @param enable if true, enables communication with the live metrics service
     */
    public static setSendLiveMetrics(enable = false) {
        if (defaultClient) {
            defaultClient.config.enableSendLiveMetrics = enable;
        }
        return Configuration;
    }
}

/**
 * Disposes the default client and all the auto collectors so they can be reinitialized with different configuration
 */
export function dispose() {
    if (defaultClient) {
        defaultClient.shutdown();
    }
    defaultClient = null;
}
