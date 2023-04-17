"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispose = exports.Configuration = exports.wrapWithCorrelationContext = exports.startOperation = exports.getCorrelationContext = exports.start = exports.setup = exports.liveMetricsClient = exports.defaultClient = exports.DistributedTracingModes = void 0;
var CorrelationContextManager = require("./AutoCollection/CorrelationContextManager"); // Keep this first
var AutoCollectConsole = require("./AutoCollection/Console");
var AutoCollectExceptions = require("./AutoCollection/Exceptions");
var AutoCollectPerformance = require("./AutoCollection/Performance");
var AutoCollecPreAggregatedMetrics = require("./AutoCollection/PreAggregatedMetrics");
var HeartBeat = require("./AutoCollection/HeartBeat");
var WebSnippet = require("./AutoCollection/WebSnippet");
var AutoCollectHttpDependencies = require("./AutoCollection/HttpDependencies");
var AutoCollectHttpRequests = require("./AutoCollection/HttpRequests");
var CorrelationIdManager = require("./Library/CorrelationIdManager");
var Logging = require("./Library/Logging");
var QuickPulseClient = require("./Library/QuickPulseStateManager");
var NativePerformance_1 = require("./AutoCollection/NativePerformance");
var AzureFunctionsHook_1 = require("./AutoCollection/AzureFunctionsHook");
// We export these imports so that SDK users may use these classes directly.
// They're exposed using "export import" so that types are passed along as expected
exports.TelemetryClient = require("./Library/NodeClient");
exports.Contracts = require("./Declarations/Contracts");
exports.azureFunctionsTypes = require("./Library/Functions");
var DistributedTracingModes;
(function (DistributedTracingModes) {
    /**
     * Send Application Insights correlation headers
     */
    DistributedTracingModes[DistributedTracingModes["AI"] = 0] = "AI";
    /**
     * (Default) Send both W3C Trace Context headers and back-compatibility Application Insights headers
     */
    DistributedTracingModes[DistributedTracingModes["AI_AND_W3C"] = 1] = "AI_AND_W3C";
})(DistributedTracingModes = exports.DistributedTracingModes || (exports.DistributedTracingModes = {}));
// Default autocollection configuration
var defaultConfig = _getDefaultAutoCollectConfig();
var _isConsole = defaultConfig.isConsole();
var _isConsoleLog = defaultConfig.isConsoleLog();
var _isExceptions = defaultConfig.isExceptions();
var _isPerformance = defaultConfig.isPerformance();
var _isPreAggregatedMetrics = defaultConfig.isPreAggregatedMetrics();
var _isHeartBeat = defaultConfig.isHeartBeat(); // off by default for now
var _isRequests = defaultConfig.isRequests();
var _isDependencies = defaultConfig.isDependencies();
var _isDiskRetry = defaultConfig.isDiskRetry();
var _isCorrelating = defaultConfig.isCorrelating();
var _forceClsHooked;
var _isSendingLiveMetrics = defaultConfig.isSendingLiveMetrics(); // Off by default
var _isNativePerformance = defaultConfig.isNativePerformance();
var _disabledExtendedMetrics;
var _isSnippetInjection = defaultConfig.isSnippetInjection(); // default to false
var _isAzureFunctions = defaultConfig.isAzureFunctions(); // default to false
function _getDefaultAutoCollectConfig() {
    return {
        isConsole: function () { return true; },
        isConsoleLog: function () { return false; },
        isExceptions: function () { return true; },
        isPerformance: function () { return true; },
        isPreAggregatedMetrics: function () { return true; },
        isHeartBeat: function () { return false; },
        isRequests: function () { return true; },
        isDependencies: function () { return true; },
        isDiskRetry: function () { return true; },
        isCorrelating: function () { return true; },
        isSendingLiveMetrics: function () { return false; },
        isNativePerformance: function () { return true; },
        isSnippetInjection: function () { return false; },
        isAzureFunctions: function () { return false; }
    };
}
var _diskRetryInterval = undefined;
var _diskRetryMaxBytes = undefined;
var _webSnippetConnectionString = undefined;
var _console;
var _exceptions;
var _performance;
var _preAggregatedMetrics;
var _heartbeat;
var _webSnippet;
var _nativePerformance;
var _serverRequests;
var _clientRequests;
var _azureFunctions;
var _isStarted = false;
var _performanceLiveMetrics;
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
function setup(setupString) {
    if (!exports.defaultClient) {
        exports.defaultClient = new exports.TelemetryClient(setupString);
        _initializeConfig();
        _console = new AutoCollectConsole(exports.defaultClient);
        _exceptions = new AutoCollectExceptions(exports.defaultClient);
        _performance = new AutoCollectPerformance(exports.defaultClient);
        _preAggregatedMetrics = new AutoCollecPreAggregatedMetrics(exports.defaultClient);
        _heartbeat = new HeartBeat(exports.defaultClient);
        _webSnippet = new WebSnippet(exports.defaultClient);
        _serverRequests = new AutoCollectHttpRequests(exports.defaultClient);
        _clientRequests = new AutoCollectHttpDependencies(exports.defaultClient);
        if (!_nativePerformance) {
            _nativePerformance = new NativePerformance_1.AutoCollectNativePerformance(exports.defaultClient);
        }
        _azureFunctions = new AzureFunctionsHook_1.AzureFunctionsHook(exports.defaultClient);
    }
    else {
        Logging.info("The default client is already setup");
    }
    if (exports.defaultClient && exports.defaultClient.channel) {
        exports.defaultClient.channel.setUseDiskRetryCaching(_isDiskRetry, _diskRetryInterval, _diskRetryMaxBytes);
    }
    return Configuration;
}
exports.setup = setup;
/**
 * Starts automatic collection of telemetry. Prior to calling start no
 * telemetry will be *automatically* collected, though manual collection
 * is enabled.
 * @returns {ApplicationInsights} this class
 */
function start() {
    if (!!exports.defaultClient) {
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
        if (exports.liveMetricsClient && _isSendingLiveMetrics) {
            exports.liveMetricsClient.enable(_isSendingLiveMetrics);
        }
        _azureFunctions.enable(_isAzureFunctions);
    }
    else {
        Logging.warn("Start cannot be called before setup");
    }
    return Configuration;
}
exports.start = start;
function _initializeConfig() {
    _isConsole = exports.defaultClient.config.enableAutoCollectExternalLoggers !== undefined ? exports.defaultClient.config.enableAutoCollectExternalLoggers : _isConsole;
    _isConsoleLog = exports.defaultClient.config.enableAutoCollectConsole !== undefined ? exports.defaultClient.config.enableAutoCollectConsole : _isConsoleLog;
    _isExceptions = exports.defaultClient.config.enableAutoCollectExceptions !== undefined ? exports.defaultClient.config.enableAutoCollectExceptions : _isExceptions;
    _isPerformance = exports.defaultClient.config.enableAutoCollectPerformance !== undefined ? exports.defaultClient.config.enableAutoCollectPerformance : _isPerformance;
    _isPreAggregatedMetrics = exports.defaultClient.config.enableAutoCollectPreAggregatedMetrics !== undefined ? exports.defaultClient.config.enableAutoCollectPreAggregatedMetrics : _isPreAggregatedMetrics;
    _isHeartBeat = exports.defaultClient.config.enableAutoCollectHeartbeat !== undefined ? exports.defaultClient.config.enableAutoCollectHeartbeat : _isHeartBeat;
    _isRequests = exports.defaultClient.config.enableAutoCollectRequests !== undefined ? exports.defaultClient.config.enableAutoCollectRequests : _isRequests;
    _isDependencies = exports.defaultClient.config.enableAutoDependencyCorrelation !== undefined ? exports.defaultClient.config.enableAutoDependencyCorrelation : _isDependencies;
    _isCorrelating = exports.defaultClient.config.enableAutoDependencyCorrelation !== undefined ? exports.defaultClient.config.enableAutoDependencyCorrelation : _isCorrelating;
    _forceClsHooked = exports.defaultClient.config.enableUseAsyncHooks !== undefined ? exports.defaultClient.config.enableUseAsyncHooks : _forceClsHooked;
    _isSnippetInjection = exports.defaultClient.config.enableWebInstrumentation !== undefined ? exports.defaultClient.config.enableWebInstrumentation : _isSnippetInjection;
    _isSnippetInjection = exports.defaultClient.config.enableAutoWebSnippetInjection === true ? true : _isSnippetInjection;
    _isAzureFunctions = exports.defaultClient.config.enableAutoCollectIncomingRequestAzureFunctions !== undefined ? exports.defaultClient.config.enableAutoCollectIncomingRequestAzureFunctions : _isAzureFunctions;
    var extendedMetricsConfig = NativePerformance_1.AutoCollectNativePerformance.parseEnabled(exports.defaultClient.config.enableAutoCollectExtendedMetrics, exports.defaultClient.config);
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
function getCorrelationContext() {
    if (_isCorrelating) {
        return CorrelationContextManager.CorrelationContextManager.getCurrentContext();
    }
    return null;
}
exports.getCorrelationContext = getCorrelationContext;
function startOperation(context, request) {
    return CorrelationContextManager.CorrelationContextManager.startOperation(context, request);
}
exports.startOperation = startOperation;
/**
 * Returns a function that will get the same correlation context within its
 * function body as the code executing this function.
 * Use this method if automatic dependency correlation is not propagating
 * correctly to an asynchronous callback.
 */
function wrapWithCorrelationContext(fn, context) {
    return CorrelationContextManager.CorrelationContextManager.wrapCallback(fn, context);
}
exports.wrapWithCorrelationContext = wrapWithCorrelationContext;
/**
 * The active configuration for global SDK behaviors, such as autocollection.
 */
var Configuration = /** @class */ (function () {
    function Configuration() {
    }
    /**
     * Sets the distributed tracing modes. If W3C mode is enabled, W3C trace context
     * headers (traceparent/tracestate) will be parsed in all incoming requests, and included in outgoing
     * requests. In W3C mode, existing back-compatibility AI headers will also be parsed and included.
     * Enabling W3C mode will not break existing correlation with other Application Insights instrumented
     * services. Default=AI
    */
    Configuration.setDistributedTracingMode = function (value) {
        CorrelationIdManager.w3cEnabled = value === DistributedTracingModes.AI_AND_W3C;
        return Configuration;
    };
    /**
     * Sets the state of console and logger tracking (enabled by default for third-party loggers only)
     * @param value if true logger activity will be sent to Application Insights
     * @param collectConsoleLog if true, logger autocollection will include console.log calls (default false)
     * @returns {Configuration} this class
     */
    Configuration.setAutoCollectConsole = function (value, collectConsoleLog) {
        if (collectConsoleLog === void 0) { collectConsoleLog = false; }
        _isConsole = value;
        _isConsoleLog = collectConsoleLog;
        if (_isStarted) {
            _console.enable(value, collectConsoleLog);
        }
        return Configuration;
    };
    /**
     * Sets the state of exception tracking (enabled by default)
     * @param value if true uncaught exceptions will be sent to Application Insights
     * @returns {Configuration} this class
     */
    Configuration.setAutoCollectExceptions = function (value) {
        _isExceptions = value;
        if (_isStarted) {
            _exceptions.enable(value);
        }
        return Configuration;
    };
    /**
     * Sets the state of performance tracking (enabled by default)
     * @param value if true performance counters will be collected every second and sent to Application Insights
     * @param collectExtendedMetrics if true, extended metrics counters will be collected every minute and sent to Application Insights
     * @returns {Configuration} this class
     */
    Configuration.setAutoCollectPerformance = function (value, collectExtendedMetrics) {
        if (collectExtendedMetrics === void 0) { collectExtendedMetrics = true; }
        _isPerformance = value;
        var extendedMetricsConfig = NativePerformance_1.AutoCollectNativePerformance.parseEnabled(collectExtendedMetrics, exports.defaultClient.config);
        _isNativePerformance = extendedMetricsConfig.isEnabled;
        _disabledExtendedMetrics = extendedMetricsConfig.disabledMetrics;
        if (_isStarted) {
            _performance.enable(value);
            _nativePerformance.enable(extendedMetricsConfig.isEnabled, extendedMetricsConfig.disabledMetrics);
        }
        return Configuration;
    };
    /**
     * Sets the state of pre aggregated metrics tracking (enabled by default)
     * @param value if true pre aggregated metrics will be collected every minute and sent to Application Insights
     * @returns {Configuration} this class
     */
    Configuration.setAutoCollectPreAggregatedMetrics = function (value) {
        _isPreAggregatedMetrics = value;
        if (_isStarted) {
            _preAggregatedMetrics.enable(value);
        }
        return Configuration;
    };
    /**
     * Sets the state of request tracking (enabled by default)
     * @param value if true HeartBeat metric data will be collected every 15 mintues and sent to Application Insights
     * @returns {Configuration} this class
     */
    Configuration.setAutoCollectHeartbeat = function (value) {
        _isHeartBeat = value;
        if (_isStarted) {
            _heartbeat.enable(value);
        }
        return Configuration;
    };
    /**
     * Sets the state of Web snippet injection, this config is NOT exposed in documentation after version 2.3.5
     * @deprecated, please use enableWebInstrumentation instead.
     * @param value if true Web snippet will be tried to be injected in server response
     * @param WebSnippetConnectionString if provided, web snippet injection will use this ConnectionString. Default to use the connectionString in Node.js app initialization
     * @returns {Configuration} this class
     */
    Configuration.enableAutoWebSnippetInjection = function (value, WebSnippetConnectionString) {
        _isSnippetInjection = value;
        _webSnippetConnectionString = WebSnippetConnectionString;
        if (_isStarted) {
            _webSnippet.enable(value, _webSnippetConnectionString);
        }
        return Configuration;
    };
    /**
     * Sets the state of Web snippet injection
     * @param value if true Web snippet will be tried to be injected in server response
     * @param WebSnippetConnectionString if provided, web snippet injection will use this ConnectionString. Default to use the connectionString in Node.js app initialization
     * @returns {Configuration} this class
     */
    Configuration.enableWebInstrumentation = function (value, WebSnippetConnectionString) {
        _isSnippetInjection = value;
        _webSnippetConnectionString = WebSnippetConnectionString;
        if (_isStarted) {
            _webSnippet.enable(value, _webSnippetConnectionString);
        }
        return Configuration;
    };
    /**
     * Sets the state of request tracking (enabled by default)
     * @param value if true requests will be sent to Application Insights
     * @returns {Configuration} this class
     */
    Configuration.setAutoCollectRequests = function (value) {
        _isRequests = value;
        if (_isStarted) {
            _serverRequests.enable(value);
        }
        return Configuration;
    };
    /**
     * Sets the state of dependency tracking (enabled by default)
     * @param value if true dependencies will be sent to Application Insights
     * @returns {Configuration} this class
     */
    Configuration.setAutoCollectDependencies = function (value) {
        _isDependencies = value;
        if (_isStarted) {
            _clientRequests.enable(value);
        }
        return Configuration;
    };
    /**
     * Sets the state of automatic dependency correlation (enabled by default)
     * @param value if true dependencies will be correlated with requests
     * @param useAsyncHooks if true, forces use of experimental async_hooks module to provide correlation. If false, instead uses only patching-based techniques. If left blank, the best option is chosen for you based on your version of Node.js.
     * @returns {Configuration} this class
     */
    Configuration.setAutoDependencyCorrelation = function (value, useAsyncHooks) {
        _isCorrelating = value;
        _forceClsHooked = useAsyncHooks;
        if (_isStarted) {
            _serverRequests.useAutoCorrelation(value, useAsyncHooks);
        }
        return Configuration;
    };
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
    Configuration.setUseDiskRetryCaching = function (value, resendInterval, maxBytesOnDisk) {
        _isDiskRetry = value;
        _diskRetryInterval = resendInterval;
        _diskRetryMaxBytes = maxBytesOnDisk;
        if (exports.defaultClient && exports.defaultClient.channel) {
            exports.defaultClient.channel.setUseDiskRetryCaching(_isDiskRetry, _diskRetryInterval, _diskRetryMaxBytes);
        }
        return Configuration;
    };
    /**
     * Enables debug and warning logging for AppInsights itself.
     * @param enableDebugLogging if true, enables debug logging
     * @param enableWarningLogging if true, enables warning logging
     * @returns {Configuration} this class
     */
    Configuration.setInternalLogging = function (enableDebugLogging, enableWarningLogging) {
        if (enableDebugLogging === void 0) { enableDebugLogging = false; }
        if (enableWarningLogging === void 0) { enableWarningLogging = true; }
        Logging.enableDebug = enableDebugLogging;
        Logging.disableWarnings = !enableWarningLogging;
        return Configuration;
    };
    /**
     * Enable automatic incoming request tracking when using Azure Functions
     * @param value if true auto collection of incoming requests will be enabled
     * @returns {Configuration} this class
     */
    Configuration.setAutoCollectIncomingRequestAzureFunctions = function (value) {
        _isAzureFunctions = value;
        if (_isStarted) {
            _azureFunctions.enable(value);
        }
        return Configuration;
    };
    /**
     * Enables communication with Application Insights Live Metrics.
     * @param enable if true, enables communication with the live metrics service
     */
    Configuration.setSendLiveMetrics = function (enable) {
        if (enable === void 0) { enable = false; }
        if (!exports.defaultClient) {
            // Need a defaultClient so that we can add the QPS telemetry processor to it
            Logging.warn("Live metrics client cannot be setup without the default client");
            return Configuration;
        }
        if (!exports.liveMetricsClient && enable) {
            // No qps client exists. Create one and prepare it to be enabled at .start()
            exports.liveMetricsClient = new QuickPulseClient(exports.defaultClient.config, exports.defaultClient.context, exports.defaultClient.getAuthorizationHandler);
            _performanceLiveMetrics = new AutoCollectPerformance(exports.liveMetricsClient, 1000, true);
            exports.liveMetricsClient.addCollector(_performanceLiveMetrics);
            exports.defaultClient.quickPulseClient = exports.liveMetricsClient; // Need this so we can forward all manual tracks to live metrics via PerformanceMetricsTelemetryProcessor
        }
        else if (exports.liveMetricsClient) {
            // qps client already exists; enable/disable it
            exports.liveMetricsClient.enable(enable);
        }
        _isSendingLiveMetrics = enable;
        return Configuration;
    };
    // Convenience shortcut to ApplicationInsights.start
    Configuration.start = start;
    return Configuration;
}());
exports.Configuration = Configuration;
/**
 * Disposes the default client and all the auto collectors so they can be reinitialized with different configuration
*/
function dispose() {
    CorrelationIdManager.w3cEnabled = true; // reset to default
    exports.defaultClient = null;
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
    if (exports.liveMetricsClient) {
        exports.liveMetricsClient.enable(false);
        _isSendingLiveMetrics = false;
        exports.liveMetricsClient = undefined;
    }
    if (_azureFunctions) {
        _azureFunctions.dispose();
    }
}
exports.dispose = dispose;
//# sourceMappingURL=applicationinsights.js.map