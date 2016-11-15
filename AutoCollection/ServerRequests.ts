///<reference path="..\typings\globals\node\index.d.ts" />

import http = require("http");
import https = require("https");
import url = require("url");

import ContractsModule = require("../Library/Contracts");
import Client = require("../Library/Client");
import Logging = require("../Library/Logging");
import Util = require("../Library/Util");
import RequestResponseHeaders = require("../Library/RequestResponseHeaders");
import ServerRequestParser = require("./ServerRequestParser");

class AutoCollectServerRequests {

    public static INSTANCE:AutoCollectServerRequests;

    private _client:Client;
    private _isEnabled: boolean;
    private _isInitialized: boolean;

    constructor(client:Client) {
        if (!!AutoCollectServerRequests.INSTANCE) {
            throw new Error("Server request tracking should be configured from the applicationInsights object");
        }

        AutoCollectServerRequests.INSTANCE = this;
        this._client = client;
    }

    public enable(isEnabled:boolean) {
        this._isEnabled = isEnabled;
        if(this._isEnabled && !this._isInitialized) {
            this._initialize();
        }
    }

    public isInitialized() {
        return this._isInitialized;
    }

    private _initialize() {
        this._isInitialized = true;

        var originalHttpServer = http.createServer;
        http.createServer = (onRequest) => {
            // todo: get a pointer to the server so the IP address can be read from server.address
            return originalHttpServer((request:http.ServerRequest, response:http.ServerResponse) => {
                if (this._isEnabled) {
                    AutoCollectServerRequests.trackRequest(this._client, request, response);
                }

                if (typeof onRequest === "function") {
                    onRequest(request, response);
                }
            });
        }

        var originalHttpsServer = https.createServer;
        https.createServer = (options, onRequest) => {
            return originalHttpsServer(options, (request:http.ServerRequest, response:http.ServerResponse) => {
                if (this._isEnabled) {
                    AutoCollectServerRequests.trackRequest(this._client, request, response);
                }

                if (typeof onRequest === "function") {
                    onRequest(request, response);
                }
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
        var requestParser = new ServerRequestParser(request);

        AutoCollectServerRequests.endRequest(client, requestParser, response, ellapsedMilliseconds, properties, error);
    }

    /**
     * Tracks a request by listening to the response 'finish' event
     */
    public static trackRequest(client:Client, request:http.ServerRequest, response:http.ServerResponse, properties?:{ [key: string]: string; }) {
        if (!request || !response || !client) {
            Logging.info("AutoCollectServerRequests.trackRequest was called with invalid parameters: ", !request, !response, !client);
            return;
        }

        AutoCollectServerRequests.addResponseIKeyHeader(client, response);

        // store data about the request
        var requestParser = new ServerRequestParser(request);

        // response listeners
        if (response.once) {
            response.once("finish", () => {
                AutoCollectServerRequests.endRequest(client, requestParser, response, null, properties, null);
            });
        }

        // track a failed request if an error is emitted
        if (request.on) {
            request.on("error", (error:any) => {
                AutoCollectServerRequests.endRequest(client, requestParser, response, null, properties, error);
            });
        }
    }

    /**
     * Add the target ikey hash to the response headers, if not already provided.
     */
    private static addResponseIKeyHeader(client:Client, response:http.ServerResponse) {
        if (client.config && client.config.instrumentationKeyHash &&
            response.getHeader && response.setHeader &&
            !response.getHeader(RequestResponseHeaders.targetInstrumentationKeyHeader)) {
                response.setHeader(RequestResponseHeaders.targetInstrumentationKeyHeader,
                    client.config.instrumentationKeyHash);
        }
    }

    private static endRequest(client: Client, requestParser: ServerRequestParser, response: http.ServerResponse, ellapsedMilliseconds?: number, properties?: { [key: string]: string}, error?: any) {
        if (error) {
            requestParser.onError(error, properties, ellapsedMilliseconds);
        } else {
            requestParser.onResponse(response, properties, ellapsedMilliseconds);
        }

        var data = requestParser.getRequestData();
        var tags = requestParser.getRequestTags(client.context.tags);
        client.track(data, tags);
    }

    public dispose() {
         AutoCollectServerRequests.INSTANCE = null;
         this._isInitialized = false;
    }
}



export = AutoCollectServerRequests;
