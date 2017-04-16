import CorrelationContextManager = require("./AutoCollection/CorrelationContextManager"); // Keep this first
import AutoCollectConsole = require("./AutoCollection/Console");
import AutoCollectExceptions = require("./AutoCollection/Exceptions");
import AutoCollectPerformance = require("./AutoCollection/Performance");
import AutoCollectHttpDependencies = require("./AutoCollection/OutgoingHttpDependencies");
import AutoCollectServerRequests = require("./AutoCollection/ServerRequests");
import Client = require("./Library/Client");
import Config = require("./Library/Config");
import Context = require("./Library/Context");
import Logging = require("./Library/Logging");
import Util = require("./Library/Util");

/**
 * A singleton meta class for:
 *   * setting library-wide configuration options
 *   * setting up and starting the default client
 *   * creating additional clients
 */
class ApplicationInsights {

    /**
    * The default client.
    */
    public static client: Client;

    private static _isConsole = true;
    private static _isExceptions = true;
    private static _isPerformance = true;
    private static _isRequests = true;
    private static _isDependencies = true;
    private static _isOfflineMode = false;
    private static _isCorrelating = false;

    private static _console: AutoCollectConsole;
    private static _exceptions: AutoCollectExceptions;
    private static _performance: AutoCollectPerformance;
    private static _serverRequests: AutoCollectServerRequests;
    private static _httpDependencies: AutoCollectHttpDependencies;

    private static _isStarted = false;

    /**
     * Creates a new client with the given instrumentation key. If this is not
     * specified, we try to read it from the environment variable
     * APPINSIGHTS_INSTRUMENTATIONKEY.
     * @returns {ApplicationInsights/Client} a new client
     */
    public static getClient(instrumentationKey?: string) {
        return new Client(instrumentationKey);
    }

    /**
     * Initializes the default client. Should be called after setting
     * configuration options.
     * 
     * @param instrumentationKey the instrumentation key to use. Optional, if
     * this is not specified, the value will be read from the environment
     * variable APPINSIGHTS_INSTRUMENTATIONKEY.
     * @returns {ApplicationInsights} this class
     */
    public static setup(instrumentationKey?: string) {
        if(!ApplicationInsights.client) {
            ApplicationInsights.client = ApplicationInsights.getClient(instrumentationKey);
            ApplicationInsights._console = new AutoCollectConsole(ApplicationInsights.client);
            ApplicationInsights._exceptions = new AutoCollectExceptions(ApplicationInsights.client);
            ApplicationInsights._performance = new AutoCollectPerformance(ApplicationInsights.client);
            ApplicationInsights._serverRequests = new AutoCollectServerRequests(ApplicationInsights.client);
            ApplicationInsights._httpDependencies = new AutoCollectHttpDependencies(ApplicationInsights.client);
        } else {
            Logging.info("The default client is already setup");
        }

        if (ApplicationInsights.client && ApplicationInsights.client.channel) {
            ApplicationInsights.client.channel.setOfflineMode(ApplicationInsights._isOfflineMode);
        }

        return ApplicationInsights;
    }

    /**
     * Starts automatic collection of telemetry. Prior to calling start no
     * telemetry will be *automatically* collected, though manual collection 
     * is enabled.
     * @returns {ApplicationInsights} this class
     */
    public static start() {
        if(!!this.client) {
            ApplicationInsights._isStarted = true;
            ApplicationInsights._console.enable(ApplicationInsights._isConsole);
            ApplicationInsights._exceptions.enable(ApplicationInsights._isExceptions);
            ApplicationInsights._performance.enable(ApplicationInsights._isPerformance);
            ApplicationInsights._serverRequests.useAutoCorrelation(ApplicationInsights._isCorrelating);
            ApplicationInsights._serverRequests.enable(ApplicationInsights._isRequests);
            ApplicationInsights._httpDependencies.enable(ApplicationInsights._isDependencies);
        } else {
            Logging.warn("Start cannot be called before setup");
        }

        return ApplicationInsights;
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
    public static getCorrelationContext(): CorrelationContextManager.CorrelationContext {
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
    public static wrapWithCorrelationContext<T extends Function>(fn: T): T {
        return CorrelationContextManager.CorrelationContextManager.wrapCallback(fn);
    }

    /**
     * Sets the state of console tracking (enabled by default)
     * @param value if true console activity will be sent to Application Insights
     * @returns {ApplicationInsights} this class
     */
    public static setAutoCollectConsole(value: boolean) {
        ApplicationInsights._isConsole = value;
        if (ApplicationInsights._isStarted){
            ApplicationInsights._console.enable(value);
        }

        return ApplicationInsights;
    }

    /**
     * Sets the state of exception tracking (enabled by default)
     * @param value if true uncaught exceptions will be sent to Application Insights
     * @returns {ApplicationInsights} this class
     */
    public static setAutoCollectExceptions(value: boolean) {
        ApplicationInsights._isExceptions = value;
        if (ApplicationInsights._isStarted){
            ApplicationInsights._exceptions.enable(value);
        }

        return ApplicationInsights;
    }

    /**
     * Sets the state of performance tracking (enabled by default)
     * @param value if true performance counters will be collected every second and sent to Application Insights
     * @returns {ApplicationInsights} this class
     */
    public static setAutoCollectPerformance(value: boolean) {
        ApplicationInsights._isPerformance = value;
        if (ApplicationInsights._isStarted){
            ApplicationInsights._performance.enable(value);
        }

        return ApplicationInsights;
    }

    /**
     * Sets the state of request tracking (enabled by default)
     * @param value if true requests will be sent to Application Insights
     * @returns {ApplicationInsights} this class
     */
    public static setAutoCollectRequests(value: boolean) {
        ApplicationInsights._isRequests = value;
        if (ApplicationInsights._isStarted) {
            ApplicationInsights._serverRequests.enable(value);
        }

        return ApplicationInsights;
    }

    /**
     * Sets the state of dependency tracking (enabled by default)
     * @param value if true dependencies will be sent to Application Insights
     * @returns {ApplicationInsights} this class
     */
    public static setAutoCollectDependencies(value: boolean) {
        ApplicationInsights._isDependencies = value;
        if (ApplicationInsights._isStarted) {
            ApplicationInsights._httpDependencies.enable(value);
        }

        return ApplicationInsights;
    }

    /**
     * Sets the state of automatic dependency correlation (enabled by default)
     * @param value if true dependencies will be correlated with requests
     * @returns {ApplicationInsights} this class
     */
    public static setAutoDependencyCorrelation(value: boolean) {
        ApplicationInsights._isCorrelating = value;
        if (ApplicationInsights._isStarted) {
            ApplicationInsights._serverRequests.useAutoCorrelation(value);
        }

        return ApplicationInsights;
    }

     /**
     * Enable or disable offline mode to cache events when client is offline (disabled by default)
     * @param value if true events that occured while client is offline will be cached on disk
     * @param resendInterval. The wait interval for resending cached events.
     * @returns {ApplicationInsights} this class
     */
    public static setOfflineMode(value: boolean, resendInterval?: number) {
        ApplicationInsights._isOfflineMode = value;
        if (ApplicationInsights.client && ApplicationInsights.client.channel){
            ApplicationInsights.client.channel.setOfflineMode(value, resendInterval);
        }

        return ApplicationInsights;
    }

    /**
     * Enables debug and warning logging for AppInsights itself.
     * @param enableWarningLogging also show warnings
     * @returns {ApplicationInsights} this class
     */
    public static enableVerboseLogging(enableWarningLogging = true) {
        Logging.enableDebug = true;
        Logging.disableWarnings = !enableWarningLogging;
        return ApplicationInsights;
    }

    /**
     * Disables debug and warning logging for AppInsights itself.
     * @returns {ApplicationInsights} this class
     */
    public static disableVerboseLogging() {
        Logging.enableDebug = false;
        Logging.disableWarnings = true;
        return ApplicationInsights;
    }

    /**
     * Deprecate me!!
     */
    public static disableConsoleLogging() {
        console.warn('disableConsoleLogging has been deprecated in favor of disableVerboseLogging');
        this.disableVerboseLogging();
    }

    /**
      * Disposes the default client and all the auto collectors so they can be reinitialized with different configuration
      */
    public static dispose() {
        ApplicationInsights.client = null;
        ApplicationInsights._isStarted = false;
        if (ApplicationInsights._console) {
            ApplicationInsights._console.dispose();
        }
        if (ApplicationInsights._exceptions) {
            ApplicationInsights._exceptions.dispose();
        }
        if (ApplicationInsights._performance) {
            ApplicationInsights._performance.dispose();
        }
        if(ApplicationInsights._serverRequests) {
            ApplicationInsights._serverRequests.dispose();
        }
        if(ApplicationInsights._httpDependencies) {
            ApplicationInsights._httpDependencies.dispose();
        }
    }
}

export = ApplicationInsights;
