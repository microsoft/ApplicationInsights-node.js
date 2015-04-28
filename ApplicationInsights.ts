///<reference path='.\typings\node\node.d.ts' />

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
class ApplicationInsights extends Client {

    private _isConsole = true;
    private _isExceptions = true;
    private _isPerformance = true;
    private _isRequests = true;

    private _console: AutoCollectConsole;
    private _exceptions: AutoCollectExceptions;
    private _performance: AutoCollectPerformance;
    private _requests: AutoCollectRequests;

    private _isStarted = false;

    constructor() {
        super();
    }

    /**
     * Initializes the default instance of the client and sets the default configuration
     * @param instrumentationKey the instrumentation key to use. Optional, if this is not specified, the value will be
     * read from the environment variable APPINSIGHTS_INSTRUMENTATION_KEY
     * @returns {AppInsights} this class
     */
    public setup(instrumentationKey?: string) {
        if(this._isStarted) {
            Logging.warn("The default instance is already setup, this could cause unexpected behavior");
        }

        this.config.instrumentationKey = instrumentationKey;
        this._console = new AutoCollectConsole(this);
        this._exceptions = new AutoCollectExceptions(this);
        this._performance = new AutoCollectPerformance(this);
        this._requests = new AutoCollectRequests(this);

        return this;
    }

    /**
     * Starts automatic collection of telemetry. Prior to calling start no telemetry will be collected
     * @returns {AppInsights} this class
     */
    public start() {
        this._isStarted = true;
        this._console.enable(this._isConsole);
        this._exceptions.enable(this._isExceptions);
        this._performance.enable(this._isPerformance);
        this._requests.enable(this._isRequests);

        return this;
    }

    /**
     * Sets the state of console tracking (enabled by default)
     * @param value if true console activity will be sent to Application Insights
     * @returns {AppInsights} this class
     */
    public setAutoCollectConsoleEnabled(value: boolean) {
        this._isConsole = value;
        if (this._isStarted){
            this._console.enable(value);
        }

        return this;
    }

    /**
     * Sets the state of exception tracking (enabled by default)
     * @param value if true uncaught exceptions will be sent to Application Insights
     * @returns {AppInsights} this class
     */
    public setAutoCollectExceptionsEnabled(value: boolean) {
        this._isExceptions = value;
        if (this._isStarted){
            this._exceptions.enable(value);
        }

        return this;
    }

    /**
     * Sets the state of performance tracking (enabled by default)
     * @param value if true performance counters will be collected every second and sent to Application Insights
     * @returns {AppInsights} this class
     */
    public setAutoCollectPerformanceEnabled(value: boolean) {
        this._isPerformance = value;
        if (this._isStarted){
            this._performance.enable(value);
        }

        return this;
    }

    /**
     * Sets the state of request tracking (enabled by default)
     * @param value if true requests will be sent to Application Insights
     * @returns {AppInsights} this class
     */
    public setAutoCollectRequestsEnabled(value: boolean) {
        this._isRequests = value;
        if (this._isStarted){
            this._requests.enable(value);
        }

        return this;
    }

    /**
     * Enables verbose debug logging
     * @returns {AppInsights} this class
     */
    public enableVerboseLogging() {
        Logging.enableDebug = true;
        return this;
    }
}

var ai = new ApplicationInsights();
export = ai;