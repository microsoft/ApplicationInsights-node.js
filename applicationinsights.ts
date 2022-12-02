import CorrelationContextManager = require("./AutoCollection/CorrelationContextManager"); // Keep this first
import AutoCollectConsole = require("./AutoCollection/Console");
import AutoCollectExceptions = require("./AutoCollection/Exceptions");
import AutoCollectPerformance = require("./AutoCollection/Performance");
import AutoCollecPreAggregatedMetrics = require("./AutoCollection/PreAggregatedMetrics");
import HeartBeat = require("./AutoCollection/HeartBeat");
import WebSnippet = require("./AutoCollection/WebSnippet");
import AutoCollectHttpDependencies = require("./AutoCollection/HttpDependencies");
import AutoCollectHttpRequests = require("./AutoCollection/HttpRequests");
import CorrelationIdManager = require("./Library/CorrelationIdManager");
import Logging = require("./Library/Logging");
import QuickPulseClient = require("./Library/QuickPulseStateManager");
import { IncomingMessage } from "http";
import { SpanContext } from "@opentelemetry/api";
import { AutoCollectNativePerformance, IDisabledExtendedMetrics } from "./AutoCollection/NativePerformance";
import { AutoCollectAzureFunctions } from "./AutoCollection/AzureFunctionsHook";
import * as azureFunctionsTypes from "@azure/functions";

// We export these imports so that SDK users may use these classes directly.
// They're exposed using "export import" so that types are passed along as expected
export import TelemetryClient = require("./Library/NodeClient");
export import Contracts = require("./Declarations/Contracts");

export enum DistributedTracingModes {
    /**
     * Send Application Insights correlation headers
     */

    AI = 0,

    /**
     * (Default) Send both W3C Trace Context headers and back-compatibility Application Insights headers
     */
    AI_AND_W3C
}

// Default autocollection configuration
let defaultConfig = _getDefaultAutoCollectConfig();
let _isConsole = defaultConfig.isConsole();
let _isConsoleLog = defaultConfig.isConsoleLog();
let _isExceptions = defaultConfig.isExceptions();
let _isPerformance = defaultConfig.isPerformance();
let _isPreAggregatedMetrics = defaultConfig.isPreAggregatedMetrics();
let _isHeartBeat = defaultConfig.isHeartBeat(); // off by default for now
let _isRequests = defaultConfig.isRequests();
let _isDependencies = defaultConfig.isDependencies();
let _isDiskRetry = defaultConfig.isDiskRetry();
let _isCorrelating = defaultConfig.isCorrelating();
let _forceClsHooked: boolean;
let _isSendingLiveMetrics = defaultConfig.isSendingLiveMetrics(); // Off by default
let _isNativePerformance = defaultConfig.isNativePerformance();
let _disabledExtendedMetrics: IDisabledExtendedMetrics;
let _isSnippetInjection = defaultConfig.isSnippetInjection(); // default to false
let _isAzureFunctions = defaultConfig.isAzureFunctions(); // default to true

function _getDefaultAutoCollectConfig() {
    return {
        isConsole: () => true,
        isConsoleLog: () => false,
        isExceptions: () => true,
        isPerformance: () => true,
        isPreAggregatedMetrics: () => true,
        isHeartBeat: () => false, // off by default for now
        isRequests: () => true,
        isDependencies: () => true,
        isDiskRetry: () => true,
        isCorrelating: () => true,
        isSendingLiveMetrics: () => false, // Off by default
        isNativePerformance: () => true,
        isSnippetInjection: () => false,
        isAzureFunctions: () => true
    }
}

let _diskRetryInterval: number = undefined;
let _diskRetryMaxBytes: number = undefined;
let _webSnippetConnectionString: string = undefined;

let _console: AutoCollectConsole;
let _exceptions: AutoCollectExceptions;
let _performance: AutoCollectPerformance;
let _preAggregatedMetrics: AutoCollecPreAggregatedMetrics;
let _heartbeat: HeartBeat;
let _webSnippet: WebSnippet;
let _nativePerformance: AutoCollectNativePerformance;
let _serverRequests: AutoCollectHttpRequests;
let _clientRequests: AutoCollectHttpDependencies;
let _azureFunctions: AutoCollectAzureFunctions;

let _isStarted = false;

/**
* The default client, initialized when setup was called. To initialize a different client
* with its own configuration, use `new TelemetryClient(instrumentationKey?)`.
*/
export let defaultClient: TelemetryClient;
export let liveMetricsClient: QuickPulseClient;
let _performanceLiveMetrics: AutoCollectPerformance;

/**
 * Initializes the default client. Should be called after setting
 * configuration options.
 *
 * @param setupString the Connection String or Instrumentation Key to use. Optional, if
 * this is not specified, the value will be read from the environment
 * variable APPLICATIONINSIGHTS_CONNECTION_STRING.
 * @returns {Configuration} the configuration class to initialize
 * and start the SDK.
 */
export function setup(setupString?: string) {
    if (!defaultClient) {
        defaultClient = new TelemetryClient(setupString);
        _initializeConfig();
        _console = new AutoCollectConsole(defaultClient);
        _exceptions = new AutoCollectExceptions(defaultClient);
        _performance = new AutoCollectPerformance(defaultClient);
        _preAggregatedMetrics = new AutoCollecPreAggregatedMetrics(defaultClient);
        _heartbeat = new HeartBeat(defaultClient);
        _webSnippet = new WebSnippet(defaultClient);
        _serverRequests = new AutoCollectHttpRequests(defaultClient);
        _clientRequests = new AutoCollectHttpDependencies(defaultClient);
        if (!_nativePerformance) {
            _nativePerformance = new AutoCollectNativePerformance(defaultClient);
        }
        _azureFunctions = new AutoCollectAzureFunctions(defaultClient);
    } else {
        Logging.info("The default client is already setup");
    }

    if (defaultClient && defaultClient.channel) {
        defaultClient.channel.setUseDiskRetryCaching(_isDiskRetry, _diskRetryInterval, _diskRetryMaxBytes);
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
    if (!!defaultClient) {
        _isStarted = true;
        _console.enable(_isConsole, _isConsoleLog);
        _exceptions.enable(_isExceptions);
        _performance.enable(_isPerformance);
        _preAggregatedMetrics.enable(_isPreAggregatedMetrics);
        _heartbeat.enable(_isHeartBeat);
        _nativePerformance.enable(_isNativePerformance, _disabledExtendedMetrics);
        _serverRequests.useAutoCorrelation(_isCorrelating, _forceClsHooked);
        _serverRequests.enable(_isRequests);
        _clientRequests.enable(_isDependencies);
        _webSnippet.enable(_isSnippetInjection, _webSnippetConnectionString);
        if (liveMetricsClient && _isSendingLiveMetrics) {
            liveMetricsClient.enable(_isSendingLiveMetrics);
        }
        _azureFunctions.enable(_isAzureFunctions);
    } else {
        Logging.warn("Start cannot be called before setup");
    }

    return Configuration;
}

function _initializeConfig() {
    _isConsole = defaultClient.config.enableAutoCollectExternalLoggers !== undefined ? defaultClient.config.enableAutoCollectExternalLoggers : _isConsole;
    _isConsoleLog = defaultClient.config.enableAutoCollectConsole !== undefined ? defaultClient.config.enableAutoCollectConsole : _isConsoleLog;
    _isExceptions = defaultClient.config.enableAutoCollectExceptions !== undefined ? defaultClient.config.enableAutoCollectExceptions : _isExceptions;
    _isPerformance = defaultClient.config.enableAutoCollectPerformance !== undefined ? defaultClient.config.enableAutoCollectPerformance : _isPerformance;
    _isPreAggregatedMetrics = defaultClient.config.enableAutoCollectPreAggregatedMetrics !== undefined ? defaultClient.config.enableAutoCollectPreAggregatedMetrics : _isPreAggregatedMetrics;
    _isHeartBeat = defaultClient.config.enableAutoCollectHeartbeat !== undefined ? defaultClient.config.enableAutoCollectHeartbeat : _isHeartBeat;
    _isRequests = defaultClient.config.enableAutoCollectRequests !== undefined ? defaultClient.config.enableAutoCollectRequests : _isRequests;
    _isDependencies = defaultClient.config.enableAutoDependencyCorrelation !== undefined ? defaultClient.config.enableAutoDependencyCorrelation : _isDependencies;
    _isCorrelating = defaultClient.config.enableAutoDependencyCorrelation !== undefined ? defaultClient.config.enableAutoDependencyCorrelation : _isCorrelating;
    _forceClsHooked = defaultClient.config.enableUseAsyncHooks !== undefined ? defaultClient.config.enableUseAsyncHooks : _forceClsHooked;
    _isSnippetInjection = defaultClient.config.enableWebInstrumentation !== undefined ? defaultClient.config.enableWebInstrumentation : _isSnippetInjection;
    _isSnippetInjection = defaultClient.config.enableAutoWebSnippetInjection === true ? true : _isSnippetInjection;
    _isAzureFunctions = defaultClient.config.enableAutoCollectAzureFunctions !== undefined ? defaultClient.config.enableAutoCollectAzureFunctions : _isPerformance;
    const extendedMetricsConfig = AutoCollectNativePerformance.parseEnabled(defaultClient.config.enableAutoCollectExtendedMetrics, defaultClient.config);
    _isNativePerformance = extendedMetricsConfig.isEnabled;
    _disabledExtendedMetrics = extendedMetricsConfig.disabledMetrics;

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
export function getCorrelationContext(): CorrelationContextManager.CorrelationContext {
    if (_isCorrelating) {
        return CorrelationContextManager.CorrelationContextManager.getCurrentContext();
    }

    return null;
}

/**
 * **(Experimental!)**
 * Starts a fresh context or propagates the current internal one.
 */
export function startOperation(context: SpanContext, name: string): CorrelationContextManager.CorrelationContext | null;
export function startOperation(context: azureFunctionsTypes.Context, request: azureFunctionsTypes.HttpRequest): CorrelationContextManager.CorrelationContext | null;
export function startOperation(context: azureFunctionsTypes.Context, name: string): CorrelationContextManager.CorrelationContext | null;
export function startOperation(context: IncomingMessage | azureFunctionsTypes.HttpRequest, request?: never): CorrelationContextManager.CorrelationContext | null;
export function startOperation(context: azureFunctionsTypes.Context | (IncomingMessage | azureFunctionsTypes.HttpRequest) | (SpanContext), request?: azureFunctionsTypes.HttpRequest | string): CorrelationContextManager.CorrelationContext | null {
    return CorrelationContextManager.CorrelationContextManager.startOperation(context, request);
}

/**
 * Returns a function that will get the same correlation context within its
 * function body as the code executing this function.
 * Use this method if automatic dependency correlation is not propagating
 * correctly to an asynchronous callback.
 */
export function wrapWithCorrelationContext<T extends Function>(fn: T, context?: CorrelationContextManager.CorrelationContext): T {
    return CorrelationContextManager.CorrelationContextManager.wrapCallback(fn, context);
}

/**
 * The active configuration for global SDK behaviors, such as autocollection.
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
        CorrelationIdManager.w3cEnabled = value === DistributedTracingModes.AI_AND_W3C;
        return Configuration;
    }

    /**
     * Sets the state of console and logger tracking (enabled by default for third-party loggers only)
     * @param value if true logger activity will be sent to Application Insights
     * @param collectConsoleLog if true, logger autocollection will include console.log calls (default false)
     * @returns {Configuration} this class
     */
    public static setAutoCollectConsole(value: boolean, collectConsoleLog: boolean = false) {
        _isConsole = value;
        _isConsoleLog = collectConsoleLog;
        if (_isStarted) {
            _console.enable(value, collectConsoleLog);
        }

        return Configuration;
    }

    /**
     * Sets the state of exception tracking (enabled by default)
     * @param value if true uncaught exceptions will be sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectExceptions(value: boolean) {
        _isExceptions = value;
        if (_isStarted) {
            _exceptions.enable(value);
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
        _isPerformance = value;
        const extendedMetricsConfig = AutoCollectNativePerformance.parseEnabled(collectExtendedMetrics, defaultClient.config);
        _isNativePerformance = extendedMetricsConfig.isEnabled;
        _disabledExtendedMetrics = extendedMetricsConfig.disabledMetrics;
        if (_isStarted) {
            _performance.enable(value);
            _nativePerformance.enable(extendedMetricsConfig.isEnabled, extendedMetricsConfig.disabledMetrics);
        }

        return Configuration;
    }

    /**
     * Sets the state of pre aggregated metrics tracking (enabled by default)
     * @param value if true pre aggregated metrics will be collected every minute and sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectPreAggregatedMetrics(value: boolean) {
        _isPreAggregatedMetrics = value;
        if (_isStarted) {
            _preAggregatedMetrics.enable(value);
        }

        return Configuration;
    }

    /**
     * Sets the state of request tracking (enabled by default)
     * @param value if true HeartBeat metric data will be collected every 15 mintues and sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectHeartbeat(value: boolean) {
        _isHeartBeat = value;
        if (_isStarted) {
            _heartbeat.enable(value);
        }

        return Configuration;
    }

    /**
     * Sets the state of Web snippet injection, this config is NOT exposed in documentation after version 2.3.5
     * @deprecated, please use enableWebInstrumentation instead.
     * @param value if true Web snippet will be tried to be injected in server response
     * @param WebSnippetConnectionString if provided, web snippet injection will use this ConnectionString. Default to use the connectionString in Node.js app initialization
     * @returns {Configuration} this class
     */
    public static enableAutoWebSnippetInjection(value: boolean, WebSnippetConnectionString?: string) {
        _isSnippetInjection = value;
        _webSnippetConnectionString = WebSnippetConnectionString;
        if (_isStarted) {
            _webSnippet.enable(value, _webSnippetConnectionString);
        }
        return Configuration;
    }

    /**
     * Sets the state of Web snippet injection
     * @param value if true Web snippet will be tried to be injected in server response
     * @param WebSnippetConnectionString if provided, web snippet injection will use this ConnectionString. Default to use the connectionString in Node.js app initialization
     * @returns {Configuration} this class
     */
    public static enableWebInstrumentation(value: boolean, WebSnippetConnectionString?: string) {
        _isSnippetInjection = value;
        _webSnippetConnectionString = WebSnippetConnectionString;
        if (_isStarted) {
            _webSnippet.enable(value, _webSnippetConnectionString);
        }

        return Configuration;
    }

    /**
     * Sets the state of request tracking (enabled by default)
     * @param value if true requests will be sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectRequests(value: boolean) {
        _isRequests = value;
        if (_isStarted) {
            _serverRequests.enable(value);
        }

        return Configuration;
    }

    /**
     * Sets the state of dependency tracking (enabled by default)
     * @param value if true dependencies will be sent to Application Insights
     * @returns {Configuration} this class
     */
    public static setAutoCollectDependencies(value: boolean) {
        _isDependencies = value;
        if (_isStarted) {
            _clientRequests.enable(value);
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
        _isCorrelating = value;
        _forceClsHooked = useAsyncHooks;
        if (_isStarted) {
            _serverRequests.useAutoCorrelation(value, useAsyncHooks);
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
        _isDiskRetry = value;
        _diskRetryInterval = resendInterval;
        _diskRetryMaxBytes = maxBytesOnDisk;
        if (defaultClient && defaultClient.channel) {
            defaultClient.channel.setUseDiskRetryCaching(_isDiskRetry, _diskRetryInterval, _diskRetryMaxBytes);
        }
        return Configuration;
    }

    /**
     * Enables debug and warning logging for AppInsights itself.
     * @param enableDebugLogging if true, enables debug logging
     * @param enableWarningLogging if true, enables warning logging
     * @returns {Configuration} this class
     */
    public static setInternalLogging(enableDebugLogging = false, enableWarningLogging = true) {
        Logging.enableDebug = enableDebugLogging;
        Logging.disableWarnings = !enableWarningLogging;
        return Configuration;
    }

    /**
     * Enable automatic incoming request tracking and correct correlation when using Azure Functions
     * @param value if true auto collection will be enabled
     * @returns {Configuration} this class
     */
    public static setAutoCollectAzureFunctions(value: boolean) {
        _isAzureFunctions = value;
        if (_isStarted) {
            _azureFunctions.enable(value);
        }
        return Configuration;
    }

    /**
     * Enables communication with Application Insights Live Metrics.
     * @param enable if true, enables communication with the live metrics service
     */
    public static setSendLiveMetrics(enable = false) {
        if (!defaultClient) {
            // Need a defaultClient so that we can add the QPS telemetry processor to it
            Logging.warn("Live metrics client cannot be setup without the default client");
            return Configuration;
        }

        if (!liveMetricsClient && enable) {
            // No qps client exists. Create one and prepare it to be enabled at .start()
            liveMetricsClient = new QuickPulseClient(defaultClient.config, defaultClient.context, defaultClient.getAuthorizationHandler);
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
    CorrelationIdManager.w3cEnabled = true; // reset to default
    defaultClient = null;
    _isStarted = false;
    if (_console) {
        _console.dispose();
    }
    if (_exceptions) {
        _exceptions.dispose();
    }
    if (_performance) {
        _performance.dispose();
    }
    if (_preAggregatedMetrics) {
        _preAggregatedMetrics.dispose();
    }
    if (_heartbeat) {
        _heartbeat.dispose();
    }
    if (_webSnippet) {
        _webSnippet.dispose();
    }
    if (_nativePerformance) {
        _nativePerformance.dispose();
    }
    if (_serverRequests) {
        _serverRequests.dispose();
    }
    if (_clientRequests) {
        _clientRequests.dispose();
    }
    if (liveMetricsClient) {
        liveMetricsClient.enable(false);
        _isSendingLiveMetrics = false;
        liveMetricsClient = undefined;
    }
    if (_azureFunctions) {
        _azureFunctions.dispose();
    }
}