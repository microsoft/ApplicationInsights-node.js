import http = require("http");
import https = require("https");
import url = require("url");

import Client = require("../Library/Client");
import Logging = require("../Library/Logging");
import Util = require("../Library/Util");
import RequestResponseHeaders = require("../Library/RequestResponseHeaders");
import ServerRequestParser = require("./ServerRequestParser");
import { CorrelationContextManager, CorrelationContext } from "./CorrelationContextManager";

class AutoCollectServerRequests {

    public static INSTANCE:AutoCollectServerRequests;

    private _client:Client;
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _isAutoCorrelating: boolean;

    constructor(client:Client) {
        if (!!AutoCollectServerRequests.INSTANCE) {
            throw new Error("Server request tracking should be configured from the applicationInsights object");
        }

        AutoCollectServerRequests.INSTANCE = this;
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

    private _generateCorrelationContext(requestParser:ServerRequestParser): CorrelationContext {
        if (!this._isAutoCorrelating) {
            return;
        }

        return CorrelationContextManager.generateContextObject(
            requestParser.getRequestId(),
            requestParser.getOperationName(this._client.context.tags),
            requestParser.getOperationId(this._client.context.tags)
        );
    }

    private _initialize() {
        this._isInitialized = true;

        var originalHttpServer = http.createServer;
        http.createServer = (onRequest) => {
            // todo: get a pointer to the server so the IP address can be read from server.address
            return originalHttpServer((request:http.ServerRequest, response:http.ServerResponse) => {
                // Set up correlation context
                var requestParser = new ServerRequestParser(request);
                var correlationContext = this._generateCorrelationContext(requestParser);

                CorrelationContextManager.runWithContext(correlationContext, () => {
                    if (this._isEnabled) {
                        // Auto collect request
                        AutoCollectServerRequests.trackRequest(this._client, request, response, null, requestParser);
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
                var requestParser = new ServerRequestParser(request);
                var correlationContext = this._generateCorrelationContext(requestParser);

                CorrelationContextManager.runWithContext(correlationContext, () => {
                    if (this._isEnabled) {
                        AutoCollectServerRequests.trackRequest(this._client, request, response, null, requestParser);
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
            Logging.info("AutoCollectServerRequests.trackRequestSync was called with invalid parameters: ", !request, !response, !client);
            return;
        }

        AutoCollectServerRequests.addResponseIKeyHeader(client, response);

        // store data about the request
        var correlationContext = CorrelationContextManager.getCurrentContext();
        var requestParser = new ServerRequestParser(request, (correlationContext && correlationContext.operation.parentId) || Util.newGuid());

        // Overwrite correlation context with request parser results
        if (correlationContext) {
            correlationContext.operation.id = requestParser.getOperationId(client.context.tags) || correlationContext.operation.id;
            correlationContext.operation.name = requestParser.getOperationName(client.context.tags) || correlationContext.operation.name;
            correlationContext.operation.parentId = requestParser.getRequestId() || correlationContext.operation.parentId;
        }

        AutoCollectServerRequests.endRequest(client, requestParser, request, response, ellapsedMilliseconds, properties, error);
    }

    /**
     * Tracks a request by listening to the response 'finish' event
     */
    public static trackRequest(client:Client, request:http.ServerRequest, response:http.ServerResponse, properties?:{ [key: string]: string; }, _requestParser?:ServerRequestParser) {
        if (!request || !response || !client) {
            Logging.info("AutoCollectServerRequests.trackRequest was called with invalid parameters: ", !request, !response, !client);
            return;
        }

        // store data about the request
        var correlationContext = CorrelationContextManager.getCurrentContext();
        var requestParser = _requestParser || new ServerRequestParser(request, correlationContext && correlationContext.operation.parentId || Util.newGuid());

        if (Util.canIncludeCorrelationHeader(client, requestParser.getUrl())) {
            AutoCollectServerRequests.addResponseIKeyHeader(client, response);
        }

        // Overwrite correlation context with request parser results (if not an automatic track. we've already precalculated the correlation context in that case)
        if (correlationContext && !_requestParser) {
            correlationContext.operation.id = requestParser.getOperationId(client.context.tags) || correlationContext.operation.id;
            correlationContext.operation.name = requestParser.getOperationName(client.context.tags) || correlationContext.operation.name;
            correlationContext.operation.parentId = requestParser.getOperationParentId(client.context.tags) || correlationContext.operation.parentId;
        }

        // response listeners
        if (response.once) {
            response.once("finish", () => {
                AutoCollectServerRequests.endRequest(client, requestParser, request, response, null, properties, null);
            });
        }

        // track a failed request if an error is emitted
        if (request.on) {
            request.on("error", (error:any) => {
                AutoCollectServerRequests.endRequest(client, requestParser, request, response, null, properties, error);
            });
        }
    }

    /**
     * Add the target ikey hash to the response headers, if not already provided.
     */
    private static addResponseIKeyHeader(client:Client, response:http.ServerResponse) {
        if (client.config && client.config.instrumentationKeyHash &&
            response.getHeader && response.setHeader &&
            !response.getHeader(RequestResponseHeaders.targetInstrumentationKeyHeader) &&
            !(<any>response).headersSent) {
                response.setHeader(RequestResponseHeaders.targetInstrumentationKeyHeader,
                    client.config.instrumentationKeyHash);
        }
    }

    private static endRequest(client: Client, requestParser: ServerRequestParser, request: http.ServerRequest, response: http.ServerResponse, ellapsedMilliseconds?: number, properties?: { [key: string]: string}, error?: any) {
        if (error) {
            requestParser.onError(error, properties, ellapsedMilliseconds);
        } else {
            requestParser.onResponse(response, properties, ellapsedMilliseconds);
        }

        var context : { [name: string]: any; } = {"http.ServerRequest": request, "http.ServerResponse": response};
        var data = requestParser.getRequestData();
        var tags = requestParser.getRequestTags(client.context.tags);        

        client.track(data, tags, context);
    }

    public dispose() {
         AutoCollectServerRequests.INSTANCE = null;
         this._isInitialized = false;
    }
}



export = AutoCollectServerRequests;
