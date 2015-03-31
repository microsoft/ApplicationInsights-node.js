///<reference path='Scripts\typings\node\node.d.ts' />

import http = require("http");
import url = require("url");
import os = require("os");

import Sender = require("./Sender");
import ai = require("./ai")

// environment variables
var ENV_azurePrefix = "APPSETTING_";
var ENV_iKey = "APPINSIGHTS_INSTRUMENTATION_KEY";
var ENV_appId = "APPINSIGHTS_APPLICATION_ID";
var ENV_appVer = "APPINSIGHTS_APPLICATION_VERSION";

class AppInsights extends ai.AppInsights {

    public config: ai.IConfig;
    public context: ai.TelemetryContext;

    private _ignoredRequests: string[];
    private _originalServer: typeof http.createServer;
    private _exceptionListenerHandle: (error: Error) => void;
    private _enableCacheOnError: boolean; 

    constructor(config?: AppInsights.IConfig) {
        // ensure we have an instrumentationKey
        if (!config || !config.instrumentationKey) {
            var iKey = process.env[ENV_iKey] || process.env[ENV_azurePrefix + ENV_iKey];
            if (!iKey || iKey == "") {
                throw new Error("Instrumentation key not found, pass the key in the config to this method or set the key in the environment variable APPINSIGHTS_INSTRUMENTATION_KEY before starting the server");
            }

            config = config || <AppInsights.IConfig>{};
            config.instrumentationKey = iKey;
        }

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
        
        this._enableCacheOnError = !!config.enableCacheOnError;  

        // initialize base class
        super(this.config);

        // load contexts
        this.context.application = new ai.Context.Application(process.env[ENV_appId] || process.env[ENV_azurePrefix + ENV_appId]);
        this.context.application.ver = process.env[ENV_appVer] || process.env[ENV_azurePrefix + ENV_appVer];
        this.context.device = new ai.Context.Device();
        this.context.device.id = os.hostname();
        this.context.device.os = os.type() + " " + os.release();
        this.context.device.osVersion = os.release();
        this.context.device.type = "server";
        this.context.location = new ai.Context.Location();

        // list of request types to ignore
        this._ignoredRequests = [];

        // wrap Javascript SDK sender to send data via HTTP requests
        var Sender = require("./Sender");
        var browserSender = this.context._sender;
        var sender: Sender = new Sender(browserSender._config);
        if (this._enableCacheOnError) {
            sender.enableCacheOnError(); 
        }
        browserSender._sender = (payload: string) => sender.send(payload);
    }

    /**
     * Wrap http.createServer to automatically track requests
     */
    public trackAllHttpServerRequests(ignoredRequests?: string): AppInsights;
    public trackAllHttpServerRequests(ignoredRequests?: string[]): AppInsights;
    public trackAllHttpServerRequests(ignoredRequests?: any): AppInsights {
        if (!this._originalServer) {

            if (ignoredRequests) {
                this._ignoredRequests = this._ignoredRequests.concat(ignoredRequests);
            }

            this._originalServer = http.createServer;
            http.createServer = (onRequest) => {
                return this._originalServer((request, response) => {
                    if (this._shouldTrack(request)) {
                        this.trackRequest(request, response);
                    }

                    if (typeof onRequest === "function") {
                        onRequest(request, response);
                    }
                });
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
        var user = new ai.Context.User(this.config.accountId);
        var session = new ai.Context.Session();
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
                var requestTelemetry: ai.Telemetry.Request;
                requestTelemetry = new ai.Telemetry.Request(name, startTime, duration, responseCode, success, properties);
                requestTelemetry.location = new ai.Context.Location();
                requestTelemetry.location.IP = this._getClientIp(request);

                // add user/session context
                requestTelemetry.user = user;
                requestTelemetry.session = session;

                // track
                this.context.track(requestTelemetry);
            });
        }

        // track an exception if the request throws an error
        request.on('error', (e: any) => {
            var error = new Error(e);
            var properties = { rawURL: request.url.toString() };
            var measurements = { "FailedAfter[ms]": +new Date - startTime };

            var exception: ai.Telemetry.Exception;
            exception = new ai.Telemetry.Exception(error, "request.on('error')", properties, measurements);
            exception.location = new ai.Context.Location();
            exception.location.IP = this._getClientIp(request);
            exception.user = user;
            exception.session = session;
            this.context.track(exception);
        });
    }

    /**
     * filters requests specified in the filteredRequests array
     */
    private _shouldTrack(request: http.ServerRequest) {
        if (request && this._ignoredRequests.length > 0) {
            var path = "" + url.parse(request.url).pathname;
            for (var i = 0; i < this._ignoredRequests.length; i++) {
                var x = "" + this._ignoredRequests[i];
                if (path.indexOf(x) > -1) {
                    return false;
                }
            }
        }

        return true;
    }

    private _getClientIp(request: any) {
        var ip:string = "";

        // regex to match ipv4 without port
        // Note: including the port would cause the payload to be rejected by the data collector
        var ipMatch = /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/;

        var check = (str:string):string => {
            var results = ipMatch.exec(str);
            if (results) {
                return results[0];
            }
        };

        if (request) {
            ip = check(request.headers['x-forwarded-for'])
            || check(request.headers['x-client-ip'])
            || check(request.headers['x-real-ip'])
            || check(request.connection && request.connection.remoteAddress)
            || check(request.socket && request.socket.remoteAddress)
            || check(request.connection && request.connection.socket && request.connection.socket.remoteAddress);
        }

        // node v12 returns this if the address is 'localhost'
        if (!ip && request.connection.remoteAddress === "::1") {
            ip = "127.0.0.1";
        }

        return ip;
    }

    private _configureCookieHandlers(request: http.ServerRequest, response: http.ServerResponse) {
        ai.Util["document"] = {
            cookie: request.headers.cookie || ""
        };

        var cookieIndex: { [key: string]: number; } = {};
        ai.Util.setCookie = (name, value) => {
            var headers: string[] = <any>response.getHeader("Set-Cookie") || [];
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

            if (response && (<any>response)["set"] && (<any>http)["OutgoingMessage"] && (<any>http)["OutgoingMessage"].prototype) {
                // use prototype if express is in use
                (<any>http)["OutgoingMessage"].prototype.call(response, 'Set-Cookie', headers)
            } else {
                // otherwise use http.server default
                response.setHeader("Set-Cookie", <any>headers);
            }
        }
    }
}

module AppInsights {
    
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
        enableCacheOnError?: boolean;
    }
    
    // For compatibility with existing code, continue to
    // publish the class as a member of the imported module
    export var NodeAppInsights = AppInsights
}

export = AppInsights
