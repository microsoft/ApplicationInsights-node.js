import AutoCollectConsole = require("./AutoCollection/Console");
import AutoCollectExceptions = require("./AutoCollection/Exceptions");
import AutoCollectPerformance = require("./AutoCollection/Performance");
import AutoCollectRequests = require("./AutoCollection/Requests");
import Client = require("./Library/Client");
import Config = require("./Library/Config");
import Context = require("./Library/Context");
import Logging = require("./Library/Logging");
import Util = require("./Library/Util");

/**
 * The singleton meta class for the default instance of the client. This class is used to setup/start and configure
 * the auto-collection behavior of the application insights module.
 */
class applicationInsights {

    public static instance: Client;

    private static _isConsole = true;
    private static _isExceptions = true;
    private static _isPerformance = true;
    private static _isRequests = true;

    private static _console: AutoCollectConsole;
    private static _exceptions: AutoCollectExceptions;
    private static _performance: AutoCollectPerformance;
    private static _requests: AutoCollectRequests;

    private static _isStarted = false;

    /**
     * Initializes the default instance of the client and sets the default configuration
     * @param instrumentationKey the instrumentation key to use. Optional, if this is not specified, the value will be
     * read from the environment variable APPINSIGHTS_INSTRUMENTATION_KEY
     * @returns {applicationInsights} this class
     */
    public static setup(instrumentationKey?: string) {
        if(!applicationInsights.instance) {
            applicationInsights.instance = new Client(instrumentationKey);
            applicationInsights._console = new AutoCollectConsole(applicationInsights.instance);
            applicationInsights._exceptions = new AutoCollectExceptions(applicationInsights.instance);
            applicationInsights._performance = new AutoCollectPerformance(applicationInsights.instance);
            applicationInsights._requests = new AutoCollectRequests(applicationInsights.instance);
        } else {
            Logging.warn("The default instance is already setup");
        }

        return applicationInsights;
    }

    /**
     * Starts automatic collection of telemetry. Prior to calling start no telemetry will be collected
     * @returns {applicationInsights} this class
     */
    public static start() {
        if(!!this.instance) {
            applicationInsights._isStarted = true;
            applicationInsights._console.enable(applicationInsights._isConsole);
            applicationInsights._exceptions.enable(applicationInsights._isExceptions);
            applicationInsights._performance.enable(applicationInsights._isPerformance);
            applicationInsights._requests.enable(applicationInsights._isRequests);
        } else {
            Logging.warn("Start cannot be called before setup");
        }

        return applicationInsights;
    }

    /**
     * Sets the state of console tracking (enabled by default)
     * @param value if true console activity will be sent to Application Insights
     * @returns {applicationInsights} this class
     */
    public static setAutoCollectConsoleEnabled(value: boolean) {
        applicationInsights._isConsole = value;
        if (applicationInsights._isStarted){
            applicationInsights._console.enable(value);
        }

        return applicationInsights;
    }

    /**
     * Sets the state of exception tracking (enabled by default)
     * @param value if true uncaught exceptions will be sent to Application Insights
     * @returns {applicationInsights} this class
     */
    public static setAutoCollectExceptionsEnabled(value: boolean) {
        applicationInsights._isExceptions = value;
        if (applicationInsights._isStarted){
            applicationInsights._exceptions.enable(value);
        }

        return applicationInsights;
    }

    /**
     * Sets the state of performance tracking (enabled by default)
     * @param value if true performance counters will be collected every second and sent to Application Insights
     * @returns {applicationInsights} this class
     */
    public static setAutoCollectPerformanceEnabled(value: boolean) {
        applicationInsights._isPerformance = value;
        if (applicationInsights._isStarted){
            applicationInsights._performance.enable(value);
        }

        return applicationInsights;
    }

    /**
     * Sets the state of request tracking (enabled by default)
     * @param value if true requests will be sent to Application Insights
     * @returns {applicationInsights} this class
     */
    public static setAutoCollectRequestsEnabled(value: boolean) {
        applicationInsights._isRequests = value;
        if (applicationInsights._isStarted){
            applicationInsights._requests.enable(value);
        }

        return applicationInsights;
    }

    /**
     * Enables verbose debug logging
     * @returns {applicationInsights} this class
     */
    public static enableVerboseLogging() {
        Logging.enableDebug = true;
        return applicationInsights;
    }
}

export = applicationInsights;