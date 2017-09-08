import http = require("http");
import https = require("https");
import url = require("url");

import TelemetryClient = require("../Library/TelemetryClient");
import Logging = require("../Library/Logging");
import Util = require("../Library/Util");
import RequestResponseHeaders = require("../Library/RequestResponseHeaders");
import HttpRequestParser = require("./HttpRequestParser");
import { CorrelationContextManager, CorrelationContext, PrivateCustomProperties } from "./CorrelationContextManager";
import AutoCollectPerformance = require("./Performance");

class AutoCollectHttpRequests {

    public static INSTANCE:AutoCollectHttpRequests;

    private _client: TelemetryClient;
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _isAutoCorrelating: boolean;

    constructor(client: TelemetryClient) {
        if (!!AutoCollectHttpRequests.INSTANCE) {
            throw new Error("Server request tracking should be configured from the applicationInsights object");
        }

        AutoCollectHttpRequests.INSTANCE = this;
        this._client = client;
    }

    public enable(isEnabled:boolean) {
        this._isEnabled = isEnabled;

        // Autocorrelation requires automatic monitoring of incoming server requests
        // Disabling autocollection but enabling autocorrelation will still enable
        // request monitoring but will not produce request events
        if ((this._isAutoCorrelating || this._isEnabled || AutoCollectPerformance.isEnabled()) && !this._isInitialized) {
            this.useAutoCorrelation(this._isAutoCorrelating);
            this._initialize();
        }
    }

    public useAutoCorrelation(isEnabled:boolean) {
        if (isEnabled && !this._isAutoCorrelating) {
            CorrelationContextManager.enable();
        } else if (!isEnabled && this._isAutoCorrelating) {
            CorrelationContextManager.disable();
        }
        this._isAutoCorrelating = isEnabled;
    }

    public isInitialized() {
        return this._isInitialized;
    }

    public isAutoCorrelating() {
        return this._isAutoCorrelating;
    }

    private _generateCorrelationContext(requestParser:HttpRequestParser): CorrelationContext {
        if (!this._isAutoCorrelating) {
            return;
        }

        return CorrelationContextManager.generateContextObject(
            requestParser.getOperationId(this._client.context.tags),
            requestParser.getRequestId(),
            requestParser.getOperationName(this._client.context.tags),
            requestParser.getCorrelationContextHeader()
        );
    }

    private _initialize() {
        this._isInitialized = true;

        const wrapOnRequestHandler: Function = (onRequest?: Function) => {
            if (!onRequest) {
                return undefined;
            }
            if (typeof onRequest !== 'function') {
                throw new Error('onRequest handler must be a function');
            }
            return (request:http.ServerRequest, response:http.ServerResponse) => {
                // Set up correlation context
                const requestParser = new HttpRequestParser(request);
                const correlationContext = this._generateCorrelationContext(requestParser);

                // Note: Check for if correlation is enabled happens within this method.
                // If not enabled, function will directly call the callback.
                CorrelationContextManager.runWithContext(correlationContext, () => {
                    if (this._isEnabled) {
                        // Auto collect request
                        AutoCollectHttpRequests.trackRequest(this._client, request, response, null, requestParser);
                    }

                    // Add this request to the performance counter
                    // Note: Check for if perf counters are enabled happens within this method.
                    // TODO: Refactor common bits between trackRequest and countRequest so they can
                    // be used together, even when perf counters are on, and request tracking is off
                    AutoCollectPerformance.countRequest(request, response);

                    if (typeof onRequest === "function") {
                        onRequest(request, response);
                    }
                });
            }
        }

        // The `http.createServer` function will instantiate a new http.Server object.
        // Inside the Server's constructor, it is using addListener to register the
        // onRequest handler. So there are two ways to inject the wrapped onRequest handler:
        // 1) Overwrite Server.prototype.addListener (and .on()) globally and not patching
        //    the http.createServer call. Or
        // 2) Overwrite the http.createServer method and add a patched addListener to the
        //    fresh server instance. This seems more stable for possible future changes as
        //    it also covers the case where the Server might not use addListener to manage
        //    the callback internally.
        //    And also as long as the constructor uses addListener to add the handle, it is
        //    ok to patch the addListener after construction only. Because if we would patch
        //    the prototype one and the createServer method, we would wrap the handler twice
        //    in case of the constructor call.
        const wrapServerEventHandler: Function = (server: (http.Server | https.Server)) => {
            const originalAddListener = server.addListener.bind(server);
            server.addListener = (eventType: string, eventHandler: Function) => {
                switch (eventType) {
                    case 'request':
                    case 'checkContinue':
                        return originalAddListener(eventType, wrapOnRequestHandler(eventHandler));
                    default:
                        return originalAddListener(eventType, eventHandler);
                }
            };
            // on is an alias to addListener only
            server.on = server.addListener;
        }

        const originalHttpServer = http.createServer;
        http.createServer = (onRequest) => {
            // todo: get a pointer to the server so the IP address can be read from server.address
            const server: http.Server = originalHttpServer(wrapOnRequestHandler(onRequest));
            wrapServerEventHandler(server);
            return server;
        }

        const originalHttpsServer = https.createServer;
        https.createServer = (options: https.ServerOptions, onRequest?: Function) => {
            const server: https.Server = originalHttpsServer(options, wrapOnRequestHandler(onRequest));
            wrapServerEventHandler(server);
            return server;
        }
    }

    /**
     * Tracks a request synchronously (doesn't wait for response 'finish' event)
     */
    public static trackRequestSync(client: TelemetryClient, request: http.ServerRequest, response:http.ServerResponse, ellapsedMilliseconds?: number, properties?:{ [key: string]: string; }, error?: any) {
        if (!request || !response || !client) {
            Logging.info("AutoCollectHttpRequests.trackRequestSync was called with invalid parameters: ", !request, !response, !client);
            return;
        }

        AutoCollectHttpRequests.addResponseCorrelationIdHeader(client, response);

        // store data about the request
        var correlationContext = CorrelationContextManager.getCurrentContext();
        var requestParser = new HttpRequestParser(request, (correlationContext && correlationContext.operation.parentId));

        // Overwrite correlation context with request parser results
        if (correlationContext) {
            correlationContext.operation.id = requestParser.getOperationId(client.context.tags) || correlationContext.operation.id;
            correlationContext.operation.name = requestParser.getOperationName(client.context.tags) || correlationContext.operation.name;
            correlationContext.operation.parentId = requestParser.getRequestId() || correlationContext.operation.parentId;
            (<PrivateCustomProperties>correlationContext.customProperties).addHeaderData(requestParser.getCorrelationContextHeader());
        }

        AutoCollectHttpRequests.endRequest(client, requestParser, request, response, ellapsedMilliseconds, properties, error);
    }

    /**
     * Tracks a request by listening to the response 'finish' event
     */
    public static trackRequest(client: TelemetryClient, request:http.ServerRequest, response:http.ServerResponse, properties?:{ [key: string]: string; }, _requestParser?:HttpRequestParser) {
        if (!request || !response || !client) {
            Logging.info("AutoCollectHttpRequests.trackRequest was called with invalid parameters: ", !request, !response, !client);
            return;
        }

        // store data about the request
        var correlationContext = CorrelationContextManager.getCurrentContext();
        var requestParser = _requestParser || new HttpRequestParser(request, correlationContext && correlationContext.operation.parentId);

        if (Util.canIncludeCorrelationHeader(client, requestParser.getUrl())) {
            AutoCollectHttpRequests.addResponseCorrelationIdHeader(client, response);
        }

        // Overwrite correlation context with request parser results (if not an automatic track. we've already precalculated the correlation context in that case)
        if (correlationContext && !_requestParser) {
            correlationContext.operation.id = requestParser.getOperationId(client.context.tags) || correlationContext.operation.id;
            correlationContext.operation.name = requestParser.getOperationName(client.context.tags) || correlationContext.operation.name;
            correlationContext.operation.parentId = requestParser.getOperationParentId(client.context.tags) || correlationContext.operation.parentId;
            (<PrivateCustomProperties>correlationContext.customProperties).addHeaderData(requestParser.getCorrelationContextHeader());
        }

        // response listeners
        if (response.once) {
            response.once("finish", () => {
                AutoCollectHttpRequests.endRequest(client, requestParser, request, response, null, properties, null);
            });
        }

        // track a failed request if an error is emitted
        if (request.on) {
            request.on("error", (error:any) => {
                AutoCollectHttpRequests.endRequest(client, requestParser, request, response, null, properties, error);
            });
        }
    }

    /**
     * Add the target correlationId to the response headers, if not already provided.
     */
    private static addResponseCorrelationIdHeader(client: TelemetryClient, response:http.ServerResponse) {
        if (client.config && client.config.correlationId &&
            response.getHeader && response.setHeader && !(<any>response).headersSent) {
            const correlationHeader = response.getHeader(RequestResponseHeaders.requestContextHeader);
            if (correlationHeader) {
                const components = correlationHeader.split(",");
                const key = `${RequestResponseHeaders.requestContextSourceKey}=`;
                if (!components.some((value) => value.substring(0,key.length) === key)) {
                    response.setHeader(
                        RequestResponseHeaders.requestContextHeader, 
                        `${correlationHeader},${RequestResponseHeaders.requestContextSourceKey}=${client.config.correlationId},${RequestResponseHeaders.requestContextSourceRoleNameKey}=${client.context.tags[client.context.keys.cloudRole]}`);
                }
            } else {
                response.setHeader(
                    RequestResponseHeaders.requestContextHeader, 
                    `${RequestResponseHeaders.requestContextSourceKey}=${client.config.correlationId},${RequestResponseHeaders.requestContextSourceRoleNameKey}=${client.context.tags[client.context.keys.cloudRole]}`);
            }
        }
    }

    private static endRequest(client: TelemetryClient, requestParser: HttpRequestParser, request: http.ServerRequest, response: http.ServerResponse, ellapsedMilliseconds?: number, properties?: { [key: string]: string}, error?: any) {
        if (error) {
            requestParser.onError(error, properties, ellapsedMilliseconds);
        } else {
            requestParser.onResponse(response, properties, ellapsedMilliseconds);
        }

        var context : { [name: string]: any; } = {"http.ServerRequest": request, "http.ServerResponse": response};
        var requestTelemetry = requestParser.getRequestTelemetry();
        requestTelemetry.tagOverrides = requestParser.getRequestTags(client.context.tags);
        requestTelemetry.contextObjects = context;
        client.trackRequest(requestTelemetry);
    }

    public dispose() {
         AutoCollectHttpRequests.INSTANCE = null;
         this.enable(false);
         this._isInitialized = false;
    }
}



export = AutoCollectHttpRequests;
