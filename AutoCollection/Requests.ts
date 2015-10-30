///<reference path="..\Declarations\node\node.d.ts" />

import http = require("http");
import https = require("https");
import url = require("url");

import ContractsModule = require("../Library/Contracts");
import Client = require("../Library/Client");
import Logging = require("../Library/Logging");
import Util = require("../Library/Util");
import RequestDataHelper = require("./RequestDataHelper");

class AutoCollectRequests {

    public static INSTANCE:AutoCollectRequests;

    private _client:Client;
    private _isEnabled: boolean;
    private _isInitialized: boolean;

    constructor(client:Client) {
        if (!!AutoCollectRequests.INSTANCE) {
            throw new Error("Request tracking should be configured from the applicationInsights object");
        }

        AutoCollectRequests.INSTANCE = this;
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
                    AutoCollectRequests.trackRequest(this._client, request, response);
                }

                if (typeof onRequest === "function") {
                    onRequest(request, response);
                }
            });
        }

	    var originalHttpsServer = https.createServer;
	    https.createServer = (options, onRequest) => {
	        return originalHttpsServer(options, (request:http.ServerRequest, response: http.ServerResponse) => {
                if (this._isEnabled) {
                    AutoCollectRequests.trackRequest(this._client, request, response);
                }

                if (typeof onRequest === "function") {
                    onRequest(request, response);
                }
            });
	    }
    }

    /**
     * Tracks a request
     */
    public static trackRequest(client:Client, request:http.ServerRequest, response:http.ServerResponse, properties?:{ [key: string]: string; }) {
        if (!request || !response || !client) {
            Logging.info("AutoCollectRequests.trackRequest was called with invalid parameters: ", !request, !response, !client);
            return;
        }

        // store data about the request
        var requestDataHelper = new RequestDataHelper(request);

        // async processing of the telemetry
        var processRequest = (isError?:boolean) => {
            setTimeout(() => {
                requestDataHelper.onResponse(response, properties);
                var data = requestDataHelper.getRequestData();
                var tags = requestDataHelper.getRequestTags(client.context.tags);
                client.track(data, tags);
            }, 0);
        };

        // response listeners
        if (response && response.once) {
            response.once("finish", () => processRequest());
        }

        // track a failed request if an error is emitted
        if (request && request.on) {
            request.on("error", (error:any) => {

                if(!properties) {
                    properties = <{[key: string]: string}>{};
                }

                if (error) {
                    if (typeof error === "string") {
                        properties["error"] = error;
                    } else if (typeof error === "object") {
                        for (var key in error) {
                            properties[key] = error[key] && error[key].toString && error[key].toString();
                        }
                    }
                }

                processRequest(true);
            });
        }
    }

    public dispose() {
         AutoCollectRequests.INSTANCE = null;
         this._isInitialized = false;
    }
}



export = AutoCollectRequests;
