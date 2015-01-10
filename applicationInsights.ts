///<reference path='.\Scripts\typings\node\node.d.ts' />
///<reference path='.\Scripts\typings\applicationInsights\ai.d.ts' />

import http = require("http");
import url = require("url");
import Sender = require("./Sender");

// environment variables
var ENV_azurePrefix = "APPSETTING_";
var ENV_iKey = "APPINSIGHTS_INSTRUMENTATION_KEY";
var ENV_appId = "APPINSIGHTS_APPLICATION_ID";
var ENV_appVer = "APPINSIGHTS_APPLICATION_VERSION";

// this tricks typescript into letting us extend the browser types without compiling against the source
var Microsoft = {
    ApplicationInsights: require("./ai")
};

export interface IConfig {
    instrumentationKey: string;
    endpointUrl?: string;
    accountId?: string;
    appUserId?: string;
    sessionRenewalMs?: number;
    sessionExpirationMs?: number;
    maxPayloadSizeInBytes?: number;
    maxBatchSizeInBytes?: number;
    maxBatchInterval?: number;
    enableDebug?: boolean;
    autoCollectErrors?: boolean;
    disableTelemetry?: boolean;
    verboseLogging?: boolean;
    diagnosticLogInterval?: number;
}

export class NodeAppInsights extends Microsoft.ApplicationInsights.AppInsights {

    public config: Microsoft.ApplicationInsights.IConfig;
    public context: Microsoft.ApplicationInsights.TelemetryContext;

    private _url;
    private _os;
    private _ignoredRequests;
    private _requestListener;
    private _originalServer;
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
        this.config = {
            instrumentationKey: config.instrumentationKey,
            endpointUrl: config.endpointUrl || "//dc.services.visualstudio.com/v2/track",
            accountId: config.accountId,
            appUserId: config.appUserId,
            sessionRenewalMs: 30 * 60 * 1000,
            sessionExpirationMs: 24 * 60 * 60 * 1000,
            maxPayloadSizeInBytes: config.maxPayloadSizeInBytes > 0 ? config.maxPayloadSizeInBytes : 200000,
            maxBatchSizeInBytes: config.maxBatchSizeInBytes > 0 ? config.maxBatchSizeInBytes : 1000000,
            maxBatchInterval: !isNaN(config.maxBatchInterval) ? config.maxBatchInterval : 15000,
            enableDebug: !!config.enableDebug,
            disableTelemetry: !!config.disableTelemetry,
            verboseLogging: !!config.verboseLogging,
            diagnosticLogInterval: config.diagnosticLogInterval || 10000,
            autoCollectErrors: false
        };

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
    public trackAllHttpServerRequests(ignoredRequests?: string);
    public trackAllHttpServerRequests(ignoredRequests?: string[]);
    public trackAllHttpServerRequests(ignoredRequests?: any) {
        if (!this._originalServer) {
            var self = this;

            if (ignoredRequests) {
                this._ignoredRequests = this._ignoredRequests.concat(ignoredRequests);
            }

            this._originalServer = http.createServer;
            http.createServer = (onRequest) => {
                var lambda = (request, response) => {
                    if (self._shouldTrack(request)) {
                        self.trackRequest(request, response);
                    }

                    if (typeof onRequest === "function") {
                        onRequest(request, response);
                    }
                }

                return self._originalServer(lambda);
            }
        }

        return this;
    }

    /**
     * Restore original http.createServer (disable auto-collection of requests)
     */
    public restoreHttpServerRequests() {
        if (this._originalServer) {
            http.createServer = this._originalServer;
            this._originalServer = undefined;
            delete this._originalServer;
        }
    }

    /**
     * Wrap process.on('uncaughtException') to automatically track exceptions
     */
    public trackAllUncaughtExceptions() {
        var self = this;
        if (!this._exceptionListenerHandle) {
            this._exceptionListenerHandle = (error: Error) => {
                self.trackException(error, "uncaughtException", { autoCollected: true });

                // Ensure i/o to transmit queued telemetry is initiated before re-throwing
                self.context._sender.triggerSend();

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
     * Tracks a request
     */
    public trackRequest(request: http.ServerRequest, response: http.ServerResponse) {
        if (!request) {
            return;
        }

        // gather information about the request
        var startTime = +new Date;
        var pathname = url.parse(request.url).pathname;
        var name = request.method + " " + pathname;
        var properties = {
            rawURL: request.url.toString()
        };

        // set user/session context (this must be done before the response finish event fires)
        this._configureCookieHandlers(request, response);
        var user = new Microsoft.ApplicationInsights.Context.User();
        var session = new Microsoft.ApplicationInsights.Context.Session();
        session.update();
        session.update = undefined; // don't let the track method auto-update

        // response listeners
        if (response && response.once) {
            response.once('finish', () => {
                // gather information about the response
                var endTime = +new Date;
                var duration = endTime - startTime;
                var responseCode = response.statusCode;
                var success = (response.statusCode < 400);

                // create telemetry object
                var requestTelemetry: Microsoft.ApplicationInsights.Telemetry.Request;
                requestTelemetry = new Microsoft.ApplicationInsights.Telemetry.Request(name, startTime, duration, responseCode, success, properties);
                requestTelemetry.location = new Microsoft.ApplicationInsights.Context.Location();
                requestTelemetry.location.IP = this._getClientIp(request);

                // add user/session context
                requestTelemetry.user = user;
                requestTelemetry.session = session;

                // track
                this.context.track(requestTelemetry);
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
            exception.user = user;
            exception.session = session;
            this.context.track(exception);
        });
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

    private _configureCookieHandlers(request: http.ServerRequest, response: http.ServerResponse) {
        Microsoft.ApplicationInsights.Util["document"] = {
            cookie: request.headers.cookie || ""
        };

        var cookieIndex = {};
        Microsoft.ApplicationInsights.Util.setCookie = (name, value) => {
            var headers: Array<string> = <any>response.getHeader("Set-Cookie") || [];
            if (typeof headers == "string") {
                headers = [<any>headers];
            }

            // overwrite existing cookies
            var data = name + "=" + value;
            if (cookieIndex[name]) {
                var index = cookieIndex[name];
                headers[index] = data
            } else {
                cookieIndex[name] = headers.length;
                headers.push(data);
            }

            if (response && response["set"] && http["OutgoingMessage"] && http["OutgoingMessage"].prototype) {
                // use prototype if express is in use
                http["OutgoingMessage"].prototype.call(response, 'Set-Cookie', headers)
            } else {
                // otherwise use http.server default
                response.setHeader("Set-Cookie", <any>headers);
            }
        }
    }
}
