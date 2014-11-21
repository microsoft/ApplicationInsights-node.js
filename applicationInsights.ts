import http = require("http");
import url = require("url");

// environment variables
var ENV_azurePrefix = "APPSETTING_";
var ENV_iKey = "APPINSIGHTS_INSTRUMENTATION_KEY";
var ENV_appId = "APPINSIGHTS_APPLICATION_ID";
var ENV_appVer = "APPINSIGHTS_APPLICATION_VERSION";

// this tricks typescript into letting us extend the browser types without compiling against the source
var Microsoft = {
    ApplicationInsights: require("./ai")
};

interface _IConfig extends Microsoft.ApplicationInsights.IConfig {
    disableRequests?: boolean;
    disableTraces?: boolean;
    disableExceptions?: boolean;
}

interface IConfig {
    instrumentationKey: string;
    endpointUrl?: string;
    accountId?: string;
    appUserId?: string;
    sessionRenewalMs?: number;
    sessionExpirationMs?: number;
    maxPayloadSizeInBytes?: number;
    bufferMinInterval?: number;
    bufferMaxInterval?: number;
    enableDebug?: boolean;
    disableTelemetry?: boolean;
    disableRequests?: boolean;
    disableTraces?: boolean;
    disableExceptions?: boolean;
}

export class NodeAppInsights extends Microsoft.ApplicationInsights.AppInsights {

    public config: _IConfig;
    public context: Microsoft.ApplicationInsights.TelemetryContext;

    private _url;
    private _os;
    private _ignoredRequests;
    private _requestListener;
    private _exceptionListenerHandle;

    constructor(config?: IConfig) {
        // ensure we have an instrumentationKey
        if (!config || !config.instrumentationKey) {
            var iKey = process.env[ENV_iKey] || process.env[ENV_azurePrefix + ENV_iKey];
            if (!iKey || iKey == "") {
                throw new Error("Instrumentation key not found, pass the key in the config to this method or set the key in the environment variable APPINSIGHTS_INSTRUMENTATION_KEY before starting the server");
            }

            config = config || <IConfig>{};
            config.instrumentationKey = iKey;
        }

        // load contexts/dependencies
        this._url = require("url");
        this._os = require("os");

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
        this.config = <any>config;

        // initialize base class
        super(this.config);

        // load contexts
        this.context.application = new Microsoft.ApplicationInsights.Context.Application();
        this.context.application.id = process.env[ENV_appId] || process.env[ENV_azurePrefix + ENV_appId];
        this.context.application.ver = process.env[ENV_appVer] || process.env[ENV_azurePrefix + ENV_appVer];
        this.context.device = new Microsoft.ApplicationInsights.Context.Device();
        this.context.device.id = this._os.hostname();
        this.context.device.os = this._os.type() + " " + this._os.release();
        this.context.device.osVersion = this._os.release();
        this.context.device.type = "server";
        this.context.location = new Microsoft.ApplicationInsights.Context.Location();

        // list of request types to ignore
        this._ignoredRequests = [];

        // wrap Javascript SDK sender to send data via HTTP requests
        var Sender = require("./Sender");
        var browserSender = this.context._sender;
        var sender: Sender = new Sender(browserSender._config);
        browserSender._sender = (payload: string) => sender.send(payload);
    }

    /**
     * Wrap http.createServer to automatically track requests
     */
    public trackAllRequests(server: http.Server, ignoredRequests?: string);
    public trackAllRequests(server: http.Server, ignoredRequests?: string[]);
    public trackAllRequests(server: http.Server, ignoredRequests?: any) {
        if (!this._requestListener) {
            var self = this;
            this._requestListener = (request: http.ServerRequest, response: http.ServerResponse) => {
                if (!self.config.disableRequests && self._shouldTrack(request)) {
                    self.trackRequest(request, response);
                }
            }
        }

        if (ignoredRequests) {
            this._ignoredRequests = this._ignoredRequests.concat(ignoredRequests);
        }

        var self = this;
        if (server && typeof server.addListener === "function") {
            server.addListener("request", this._requestListener);
        }

        return this;
    }

    /**
     * Restore original http.createServer (disable auto-collection of requests)
     */
    public removeRequestListenr(server: http.Server) {
        if (server && typeof server.removeListener === "function") {
            server.removeListener("request", this._requestListener);
        }
    }

    /**
     * Wrap process.on('uncaughtException') to automatically track exceptions
     */
    public trackAllUncaughtExceptions() {
        var self = this;
        if (!this._exceptionListenerHandle) {
            this._exceptionListenerHandle = (error: Error) => {
                if (!self.config.disableExceptions) {
                    self.trackException(error, "uncaughtException", { autoCollected: true });
                }

                throw error;
            };

            process.on("uncaughtException", this._exceptionListenerHandle);
        }

        return this;
    }

    /**
     * Restore original http.createServer (disable auto-collection of requests)
     */
    public restoreUncaughtExceptions() {
        if (this._exceptionListenerHandle) {
            process.removeListener("uncaughtException", this._exceptionListenerHandle);
            this._exceptionListenerHandle = undefined;
            delete this._exceptionListenerHandle;
        }
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
            exception = new Microsoft.ApplicationInsights.Telemetry.Exception(error, "request.on('error')", properties, measurements);
            exception.location = new Microsoft.ApplicationInsights.Context.Location();
            exception.location.IP = this._getClientIp(request);
            //exception.user = new this._UserContext(request);
            //exception.session = new this._SessionContext(request, response);
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

        // gather information about the request/response
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
        requestTelemetry.location = new Microsoft.ApplicationInsights.Context.Location();
        requestTelemetry.location.IP = this._getClientIp(request);

        // add context
        //requestTelemetry.user = new this._UserContext(request, response);
        //requestTelemetry.session = new this._SessionContext(request, response);

        this._handleCookies(request, response);

        // track
        this.context.track(requestTelemetry);
    }

    /**
     * filters requests specified in the filteredRequests array
     */
    private _shouldTrack(request) {
        if (request && this._ignoredRequests.length > 0) {
            var path = "" + this._url.parse(request.url).pathname;
            for (var i = 0; i < this._ignoredRequests.length; i++) {
                var x = "" + this._ignoredRequests[i];
                if (path.indexOf(x) > -1) {
                    return false;
                }
            }
        }

        return true;
    }

    private _getClientIp(request) {
        if (request) {
            // attempt to get IP from headers in case there is a proxy
            if (request.headers && request.headers['x-forwarded-for']) {
                var forwardedFor = request.headers['x-forwarded-for'];
                if (typeof forwardedFor.split === "function") {
                    forwardedFor.split(",")[0];
                    return forwardedFor.split(",")[0];
                }
            }

            // attempt to get IP from request
            if (request.connection && request.connection.remoteAddress) {
                return request.connection.remoteAddress;
            } else if (request.socket && request.socket.remoteAddress) {
                return request.socket.remoteAddress;
            } else if (request.connection && request.connection.socket && request.connection.socket.remoteAddress) {
                return request.connection.socket.remoteAddress;
            }
        }

        return "";
    }

    private _handleCookies(request: http.ServerRequest, response: http.ServerResponse) {

        // todo: override browser cookie handling
    }
}