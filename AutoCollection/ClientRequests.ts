///<reference path="..\Declarations\node\node.d.ts" />

import http = require("http");
import url = require("url");

import ContractsModule = require("../Library/Contracts");
import Client = require("../Library/Client");
import Logging = require("../Library/Logging");
import Util = require("../Library/Util");
import ClientRequestParser = require("./ClientRequestParser");

class AutoCollectClientRequests {

    public static INSTANCE: AutoCollectClientRequests;

    private _client:Client;
    private _isEnabled: boolean;
    private _isInitialized: boolean;

    constructor(client:Client) {
        if (!!AutoCollectClientRequests.INSTANCE) {
            throw new Error("Client request tracking should be configured from the applicationInsights object");
        }

        AutoCollectClientRequests.INSTANCE = this;
        this._client = client;
    }

    public enable(isEnabled:boolean) {
        this._isEnabled = isEnabled;
        if (this._isEnabled && !this._isInitialized) {
            this._initialize();
        }
    }

    public isInitialized() {
        return this._isInitialized;
    }

    private _initialize() {
        this._isInitialized = true;
        // Note there's no need to redirect https.request because it just uses http.request.
        const originalRequest = http.request;
        http.request = (options, ...requestArgs) => {
            const request: http.ClientRequest = originalRequest.call(
                http, options, ...requestArgs);
            if (request && options && !options['disableAppInsigntsAutoCollection']) {
                AutoCollectClientRequests.trackRequest(this._client, options, request);
            }
            return request;
        };
    }

    public static trackRequest(client: Client, requestOptions: any, request: http.ClientRequest,
            properties?: { [key: string]: string }) {
        let requestParser = new ClientRequestParser(requestOptions, request);
        request.on('response', (response: http.ClientResponse) => {
            requestParser.onResponse(response, properties);
            client.track(requestParser.getDependencyData());
        });
        request.on('error', (e: Error) => {
            requestParser.onError(e, properties);
            client.track(requestParser.getDependencyData());
        });
    }

    public dispose() {
         AutoCollectClientRequests.INSTANCE = null;
         this._isInitialized = false;
    }
}

export = AutoCollectClientRequests;
