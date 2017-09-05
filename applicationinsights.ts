import CorrelationContextManager = require("./AutoCollection/CorrelationContextManager"); // Keep this first
import AutoCollectConsole = require("./AutoCollection/Console");
import AutoCollectExceptions = require("./AutoCollection/Exceptions");
import AutoCollectPerformance = require("./AutoCollection/Performance");
import AutoCollectHttpDependencies = require("./AutoCollection/HttpDependencies");
import AutoCollectHttpRequests = require("./AutoCollection/HttpRequests");
import Config = require("./Library/Config");
import Context = require("./Library/Context");
import Logging = require("./Library/Logging");
import Util = require("./Library/Util");

// We export these imports so that SDK users may use these classes directly.
// They're exposed using "export import" so that types are passed along as expected
export import Client = require("./Library/NodeClient");
export import Contracts = require("./Declarations/Contracts");

// Default autocollection configuration
let _isConsole = true;
let _isExceptions = true;
let _isPerformance = true;
let _isRequests = true;
let _isDependencies = true;
let _isOfflineMode = false;
let _isCorrelating = true;

let _console: AutoCollectConsole;
let _exceptions: AutoCollectExceptions;
let _performance: AutoCollectPerformance;
let _serverRequests: AutoCollectHttpRequests;
let _clientRequests: AutoCollectHttpDependencies;

let _isStarted = false;

/**
* The default client, initialized when setup was called. To initialize a different client
* with its own configuration, use `new Client(instrumentationKey?)`.
*/
export let defaultClient: Client;

/**
 * Initializes the default client. Should be called after setting
 * configuration options.
 * 
 * @param instrumentationKey the instrumentation key to use. Optional, if
 * this is not specified, the value will be read from the environment
 * variable APPINSIGHTS_INSTRUMENTATIONKEY.
 * @returns {ConfigurationBuilder} the configuration class to initialize
 * and start the SDK.
 */
export function setup(instrumentationKey?: string) {
    if(!defaultClient) {
        defaultClient = new Client(instrumentationKey);
        _console = new AutoCollectConsole(defaultClient);
        _exceptions = new AutoCollectExceptions(defaultClient);
        _performance = new AutoCollectPerformance(defaultClient);
        _serverRequests = new AutoCollectHttpRequests(defaultClient);
        _clientRequests = new AutoCollectHttpDependencies(defaultClient);
    } else {
        Logging.info("The default client is already setup");
    }

    if (defaultClient && defaultClient.channel) {
        defaultClient.channel.setOfflineMode(_isOfflineMode);
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
    if(!!defaultClient) {
        _isStarted = true;
        _console.enable(_isConsole);
        _exceptions.enable(_isExceptions);
        _performance.enable(_isPerformance);
        _serverRequests.useAutoCorrelation(_isCorrelating);
        _serverRequests.enable(_isRequests);
        _clientRequests.enable(_isDependencies);
    } else {
        Logging.warn("Start cannot be called before setup");
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
export function getCorrelationContext(): CorrelationContextManager.CorrelationContext {
    if (this._isCorrelating) {
        return CorrelationContextManager.CorrelationContextManager.getCurrentContext();
    }

    return null;
}

/**
 * Returns a function that will get the same correlation context within its
 * function body as the code executing this function.
 * Use this method if automatic dependency correlation is not propagating
 * correctly to an asynchronous callback.
 */
export function wrapWithCorrelationContext<T extends Function>(fn: T): T {
    return CorrelationContextManager.CorrelationContextManager.wrapCallback(fn);
}

/**
 * The active configuration for global SDK behaviors, such as autocollection.
 */
export class Configuration {
    // Convenience shortcut to ApplicationInsights.start
    public static start = start;

    /**
     * Sets the state of console tracking (enabled by default)
     * @param value if true console activity will be sent to Application Insights
     * @returns {ApplicationInsights} this class
     */
    public static setAutoCollectConsole(value: boolean) {
        _isConsole = value;
        if (_isStarted){
            _console.enable(value);
        }

        return Configuration;
    }

    /**
     * Sets the state of exception tracking (enabled by default)
     * @param value if true uncaught exceptions will be sent to Application Insights
     * @returns {ApplicationInsights} this class
     */
    public static setAutoCollectExceptions(value: boolean) {
        _isExceptions = value;
        if (_isStarted){
            _exceptions.enable(value);
        }

        return Configuration;
    }

    /**
     * Sets the state of performance tracking (enabled by default)
     * @param value if true performance counters will be collected every second and sent to Application Insights
     * @returns {ApplicationInsights} this class
     */
    public static setAutoCollectPerformance(value: boolean) {
        _isPerformance = value;
        if (_isStarted){
            _performance.enable(value);
        }

        return Configuration;
    }

    /**
     * Sets the state of request tracking (enabled by default)
     * @param value if true requests will be sent to Application Insights
     * @returns {ApplicationInsights} this class
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
     * @returns {ApplicationInsights} this class
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
     * @returns {ApplicationInsights} this class
     */
    public static setAutoDependencyCorrelation(value: boolean) {
        _isCorrelating = value;
        if (_isStarted) {
            _serverRequests.useAutoCorrelation(value);
        }

        return Configuration;
    }

        /**
     * Enable or disable offline mode to cache events when client is offline (disabled by default)
     * @param value if true events that occured while client is offline will be cached on disk
     * @param resendInterval. The wait interval for resending cached events.
     * @returns {ApplicationInsights} this class
     */
    public static setOfflineMode(value: boolean, resendInterval?: number) {
        _isOfflineMode = value;
        if (defaultClient && defaultClient.channel){
            defaultClient.channel.setOfflineMode(value, resendInterval);
        }

        return Configuration;
    }

    /**
     * Enables debug and warning logging for AppInsights itself.
     * @param enableDebugLogging if true, enables debug logging
     * @param enableWarningLogging if true, enables warning logging
     * @returns {ApplicationInsights} this class
     */
    public static setInternalLogging(enableDebugLogging = false, enableWarningLogging = true) {
        Logging.enableDebug = enableDebugLogging;
        Logging.disableWarnings = enableWarningLogging;
        return Configuration;
    }
}

/**
 * Disposes the default client and all the auto collectors so they can be reinitialized with different configuration
*/
export function dispose() {
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
    if(_serverRequests) {
        _serverRequests.dispose();
    }
    if(_clientRequests) {
        _clientRequests.dispose();
    }
}
