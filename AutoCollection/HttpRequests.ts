import http = require("http");
import https = require("https");
import url = require("url");

import Client = require("../Library/Client");
import Logging = require("../Library/Logging");
import Util = require("../Library/Util");
import RequestResponseHeaders = require("../Library/RequestResponseHeaders");
import HttpRequestParser = require("./HttpRequestParser");
import { CorrelationContextManager, CorrelationContext, PrivateCustomProperties } from "./CorrelationContextManager";

class AutoCollectHttpRequests {

    public static INSTANCE:AutoCollectHttpRequests;

    private _client:Client;
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _isAutoCorrelating: boolean;

    constructor(client:Client) {
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
        if ((this._isAutoCorrelating || this._isEnabled) && !this._isInitialized) {
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

        var originalHttpServer = http.createServer;
        http.createServer = (onRequest) => {
            // todo: get a pointer to the server so the IP address can be read from server.address
            return originalHttpServer((request:http.ServerRequest, response:http.ServerResponse) => {
                // Set up correlation context
                var requestParser = new HttpRequestParser(request);
                var correlationContext = this._generateCorrelationContext(requestParser);

                CorrelationContextManager.runWithContext(correlationContext, () => {
                    if (this._isEnabled) {
                        // Auto collect request
                        AutoCollectHttpRequests.trackRequest(this._client, request, response, null, requestParser);
                    }

                    if (typeof onRequest === "function") {
                        onRequest(request, response);
                    }
                });
            });
        }

        var originalHttpsServer = https.createServer;
        https.createServer = (options, onRequest) => {
            return originalHttpsServer(options, (request:http.ServerRequest, response:http.ServerResponse) => {
                // Set up correlation context
                var requestParser = new HttpRequestParser(request);
                var correlationContext = this._generateCorrelationContext(requestParser);

                CorrelationContextManager.runWithContext(correlationContext, () => {
                    if (this._isEnabled) {
                        AutoCollectHttpRequests.trackRequest(this._client, request, response, null, requestParser);
                    }

                    if (typeof onRequest === "function") {
                        onRequest(request, response);
                    }
                });
            });
        }
    }

    /**
     * Tracks a request synchronously (doesn't wait for response 'finish' event)
     */
    public static trackRequestSync(client: Client, request: http.ServerRequest, response:http.ServerResponse, ellapsedMilliseconds?: number, properties?:{ [key: string]: string; }, error?: any) {
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
    public static trackRequest(client:Client, request:http.ServerRequest, response:http.ServerResponse, properties?:{ [key: string]: string; }, _requestParser?:HttpRequestParser) {
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
    private static addResponseCorrelationIdHeader(client:Client, response:http.ServerResponse) {
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

    private static endRequest(client: Client, requestParser: HttpRequestParser, request: http.ServerRequest, response: http.ServerResponse, ellapsedMilliseconds?: number, properties?: { [key: string]: string}, error?: any) {
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
