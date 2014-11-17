/// <reference path="Context/UserContext.ts" />
/// <reference path="Context/SessionContext.ts" />
/// <reference path="Context/DeviceContext.ts" />
/// <reference path="Context/LocationContext.ts" />
/// <reference path="Context/ApplicationContext.ts" />
/// <reference path="Util.ts" />
/// <reference path="Sender.ts" />
/// <reference path="Scripts/typings/node/node.d.ts" />
/// <reference path="Scripts/typings/applicationInsights/ai.d.ts" />

import http = require("http");
import url = require("url");

// this is the "Microsoft" module from the browser JS SDK
var Microsoft = {
    ApplicationInsights: require("./ai")
};

var UserContext = require("./context/UserContext");
var SessionContext = require("./context/SessionContext");
var DeviceContext = require("./context/DeviceContext");
var LocationContext = require("./context/LocationContext");
var ApplicationContext = require("./context/ApplicationContext");

interface IConfig extends Microsoft.ApplicationInsights.IConfig {
    disableRequests?: boolean;
    disableTraces?: boolean;
    disableExceptions?: boolean;
}

class AppInsights extends Microsoft.ApplicationInsights.AppInsights {
    public config: IConfig;
    public context: Microsoft.ApplicationInsights.TelemetryContext;

    private _util;
    private _filteredRequests;

    constructor(config?: IConfig) {
        // ensure we have an instrumentationKey
        if (!config || !config.instrumentationKey) {
            var iKeyEnvVariableName = "APPINSIGHTS_INSTRUMENTATION_KEY";
            var azureAppSettingPrefix = "APPSETTING_";
            var iKey = process.env[iKeyEnvVariableName] || process.env[azureAppSettingPrefix + iKeyEnvVariableName];
            if (!iKey || iKey == "") {
                throw new Error("Instrumentation key not found, pass the key in the config to this method or set the key in the environment variable APPINSIGHTS_INSTRUMENTATION_KEY before starting the server");
            }

            config = config || <IConfig>{};
            config.instrumentationKey = iKey;
        }

        // set default values
        config.endpointUrl = config.endpointUrl || "//dc.services.visualstudio.com/v2/track";
        config.accountId = config.accountId;
        config.appUserId = config.appUserId;
        config.sessionRenewalMs = 30 * 60 * 1000;
        config.sessionExpirationMs = 24 * 60 * 60 * 1000;
        config.maxPayloadSizeInBytes = config.maxPayloadSizeInBytes > 0 ? config.maxPayloadSizeInBytes : 900000;
        config.bufferMinInterval = !isNaN(config.bufferMinInterval) ? config.bufferMinInterval : 0;
        config.bufferMaxInterval = !isNaN(config.bufferMaxInterval) ? config.bufferMaxInterval : 5000;
        config.enableDebug = !!config.enableDebug;
        config.disableTelemetry = !!config.disableTelemetry;
        config.disableRequests = !!config.disableRequests;
        config.disableTraces = !!config.disableTraces;
        config.disableExceptions = !!config.disableExceptions;
        this.config = config;

        // initialize base class
        super(this.config);

        // override default contexts
        this.context.device = new DeviceContext();
        this.context.application = new ApplicationContext();

        // list of request types to ignore
        this._filteredRequests = [];

        // wrap Javascript SDK sender to send data via HTTP requests
        var NodeSender = require("./Sender");
        var browserSender = this.context._sender;
        browserSender._sender = (payload: string) => NodeSender.sender(payload, browserSender._config);

        // load other dependencies
        this._util = require('./Util');

        // set up auto-collection of requests/traces/exceptions
        this._wrapCreateServer();
        this._wrapConsoleLog();
        this._wrapUncaughtException();
    }

    /**
     * Adds items to an array of request strings which will not be tracked
     */
    public filter(types: string[]) {
        this._filteredRequests = this._filteredRequests.concat(types);
    }

    /**
     * Tracks a request/response
     */
    public trackRequest(request: http.ServerRequest, response: http.ServerResponse) {
        if (!request) {
            return;
        }

        var startTime = +new Date;

        // response listeners
        response.once('finish', () => {
            this._trackResponse.apply(this, [request, response, startTime]);
        });

        // track an exception if the request throws an error
        request.on('error', (e) => {
            var error = new Error(e);
            var properties = { rawURL: request.url.toString() };
            var measurements = { "FailedAfter[ms]": +new Date - startTime };

            var exception: Microsoft.ApplicationInsights.Telemetry.Exception;
            exception = new Microsoft.ApplicationInsights.Telemetry.Exception(error, properties, measurements);
            exception.device = new DeviceContext(request);
            exception.application = new ApplicationContext();
            exception.user = new UserContext(request);
            exception.session = new SessionContext(request, response);
            exception.location = new LocationContext(request, response);
            this.context.track(exception);
        });
    }

    /**
     * Called when response finishes; initializes remaining context on the RequestTelemetry object
     */
    private _trackResponse(request: http.ServerRequest, response: http.ServerResponse, startTime: number) {
        if (!response) {
            return;
        }

        // extract information from request/response
        var pathname = url.parse(request.url).pathname;
        var name = request.method + " " + pathname;
        var endTime = +new Date;
        var duration = endTime - startTime;
        var responseCode = response.statusCode;
        var success = (response.statusCode < 400);
        var properties = {
            rawURL: request.url.toString()
        };

        // create telemetry object
        var requestTelemetry: Microsoft.ApplicationInsights.Telemetry.Request;
        requestTelemetry = new Microsoft.ApplicationInsights.Telemetry.Request(name, startTime, duration, responseCode, success, properties);
        //requestTelemetry.data.item.id = this._uuid.v4();
        requestTelemetry.time = this._util.localDate(new Date());

        // add context
        requestTelemetry.device = new DeviceContext(request);
        requestTelemetry.application = new ApplicationContext();
        //requestTelemetry.user = new UserContext(request, response);
        //requestTelemetry.session = new SessionContext(request, response);
        requestTelemetry.location = new LocationContext(request);

        // track
        this.context.track(requestTelemetry);
    }

    /**
     * Wrap http.createServer to automatically track requests
     */
    private _wrapCreateServer() {
        var self = this;
        var originalCreateServer = http.createServer;
        http.createServer = (onRequest) => {
            var lambda = (request, response) => {
                if (!self.config.disableRequests) {
                    self.trackRequest(request, response);
                }

                onRequest(request, response);
            }

            return originalCreateServer(lambda);
        }
    }

    /**
     * Wrap console.log to automatically track logging
     */
    private _wrapConsoleLog() {
        var self = this;
        var original = console.log;
        console.log = (message: string) => {
            if (!self.config.disableTraces) {
                self.trackTrace(message, { autoCollected: true });
            }

            original(message);
        }
    }

    /**
     * Wrap process.on('uncaughtException') to automatically track exceptions
     */
    private _wrapUncaughtException() {
        var self = this;
        process.on("uncaughtException", (error: Error) => {
            if (!self.config.disableExceptions) {
                self.trackException(error, "uncaughtException", { autoCollected: true });
            }
        });
    }

    /**
     * filters requests specified in the filteredRequests array
     */
    private _shouldFilter(request: http.ServerRequest) {
        var path = "" + url.parse(request.url).pathname;
        for (var i = 0; i < this._filteredRequests.length; i++) {
            var x = "" + this._filteredRequests[i];
            if (path.indexOf(x) > -1) {
                return false;
            }
        }
        return true;
    }
}

module.exports = AppInsights;