import http = require('http');

// this tricks typescript into letting us extend the browser types without compiling against their typescript source
var Microsoft = {
    ApplicationInsights: require("./ai")
};

interface IConfig extends Microsoft.ApplicationInsights.IConfig {
    disableRequests?: boolean;
    disableTraces?: boolean;
    disableExceptions?: boolean;
}

export class applicationInsights extends Microsoft.ApplicationInsights.AppInsights {
    public config: IConfig;
    public context: Microsoft.ApplicationInsights.TelemetryContext;

    private _util;
    private _filteredRequests;
    private _UserContext;
    private _SessionContext;
    private _DeviceContext;
    private _LocationContext;
    private _ApplicationContext;

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

        // load contexts/dependencies
        this._util = require('./Util');
        this._UserContext = require("./context/UserContext");
        this._SessionContext = require("./context/SessionContext");
        this._DeviceContext = require("./context/DeviceContext");
        this._LocationContext = require("./context/LocationContext");
        this._ApplicationContext = require("./context/ApplicationContext");

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
        this.context.device = new this._DeviceContext();
        this.context.application = new this._ApplicationContext();

        // list of request types to ignore
        this._filteredRequests = [];

        // wrap Javascript SDK sender to send data via HTTP requests
        var NodeSender = require("./Sender");
        var browserSender = this.context._sender;
        browserSender._sender = (payload: string) => NodeSender.sender(payload, browserSender._config);

        // set up auto-collection of requests/traces/exceptions
        this._wrapCreateServer();
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
        if (response && response.once) {
            response.once('finish', () => {
                this._trackResponse.apply(this, [request, response, startTime]);
            });
        }

        // track an exception if the request throws an error
        request.on('error', (e) => {
            var error = new Error(e);
            var properties = { rawURL: request.url.toString() };
            var measurements = { "FailedAfter[ms]": +new Date - startTime };

            var exception: Microsoft.ApplicationInsights.Telemetry.Exception;
            exception = new ai.Telemetry.Exception(error, "request.on('error')", properties, measurements);
            exception.device = new this._DeviceContext(request);
            exception.application = new this._ApplicationContext();
            exception.user = new this._UserContext(request);
            exception.session = new this._SessionContext(request, response);
            exception.location = new this._LocationContext(request, response);
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
        requestTelemetry = new ai.Telemetry.Request(name, startTime, duration, responseCode, success, properties);
        //requestTelemetry.data.item.id = this._uuid.v4();
        requestTelemetry.time = this._util.localDate(new Date());

        // add context
        requestTelemetry.device = new this._DeviceContext(request);
        requestTelemetry.application = new this._ApplicationContext();
        //requestTelemetry.user = new this._UserContext(request, response);
        //requestTelemetry.session = new this._SessionContext(request, response);
        requestTelemetry.location = new this._LocationContext(request);

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
                if (!self.config.disableRequests && self._shouldTrack(request)) {
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
    private _shouldTrack(request) {
        if (request) {
            var path = "" + url.parse(request.url).pathname;
            for (var i = 0; i < this._filteredRequests.length; i++) {
                var x = "" + this._filteredRequests[i];
                if (path.indexOf(x) > -1) {
                    return false;
                }
            }
        }

        return true;
    }
}