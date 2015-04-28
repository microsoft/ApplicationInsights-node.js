///<reference path='.\Declarations\node\node.d.ts' />

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
class ApplicationInsights {

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
     * @returns {ApplicationInsights} this class
     */
    public static setup(instrumentationKey?: string) {
        if(!ApplicationInsights.instance) {
            ApplicationInsights.instance = new Client(instrumentationKey);
            ApplicationInsights._console = new AutoCollectConsole(ApplicationInsights.instance);
            ApplicationInsights._exceptions = new AutoCollectExceptions(ApplicationInsights.instance);
            ApplicationInsights._performance = new AutoCollectPerformance(ApplicationInsights.instance);
            ApplicationInsights._requests = new AutoCollectRequests(ApplicationInsights.instance);
        } else {
            Logging.warn("The default instance is already setup");
        }

        return ApplicationInsights;
    }

    /**
     * Starts automatic collection of telemetry. Prior to calling start no telemetry will be collected
     * @returns {ApplicationInsights} this class
     */
    public static start() {
        if(!!this.instance) {
            ApplicationInsights._isStarted = true;
            ApplicationInsights._console.enable(ApplicationInsights._isConsole);
            ApplicationInsights._exceptions.enable(ApplicationInsights._isExceptions);
            ApplicationInsights._performance.enable(ApplicationInsights._isPerformance);
            ApplicationInsights._requests.enable(ApplicationInsights._isRequests);
        } else {
            Logging.warn("Start cannot be called before setup");
        }

        return ApplicationInsights;
    }

    /**
     * Sets the state of console tracking (enabled by default)
     * @param value if true console activity will be sent to Application Insights
     * @returns {ApplicationInsights} this class
     */
    public static setAutoCollectConsoleEnabled(value: boolean) {
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
    public static setAutoCollectExceptionsEnabled(value: boolean) {
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
    public static setAutoCollectPerformanceEnabled(value: boolean) {
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
    public static setAutoCollectRequestsEnabled(value: boolean) {
        ApplicationInsights._isRequests = value;
        if (ApplicationInsights._isStarted){
            ApplicationInsights._requests.enable(value);
        }

        return ApplicationInsights;
    }

    /**
     * Enables verbose debug logging
     * @returns {ApplicationInsights} this class
     */
    public static enableVerboseLogging() {
        Logging.enableDebug = true;
        return ApplicationInsights;
    }
}

export = ApplicationInsights;