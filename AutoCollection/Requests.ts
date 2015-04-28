///<reference path="..\Declarations\node\node.d.ts" />

import http = require("http");
import url = require("url");

import ContractsModule = require("../Library/Contracts");
import Client = require("../Library/Client");
import Logging = require("../Library/Logging");
import Util = require("../Library/Util");

class AutoCollectRequests {

    private static _INSTANCE:AutoCollectRequests = null;

    private _client:Client;
    private _isEnabled: boolean;
    private _isInitialized: boolean;

    constructor(client:Client) {
        if (AutoCollectRequests._INSTANCE !== null) {
            throw new Error("Request tracking should be configured from the ApplicationInsights object");
        }

        this._client = client;
    }

    public enable(isEnabled:boolean) {
        this._isEnabled = isEnabled;
        if(this._isEnabled && !this._isInitialized) {
            this._initialize();
        }
    }

    private _initialize() {
        var originalServer = http.createServer;
        http.createServer = (onRequest) => {
            // todo: get a pointer to the server so the IP address can be read from server.address
            return originalServer((request:http.ServerRequest, response:http.ServerResponse) => {
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
            Logging.warn("AutoCollectRequests.trackRequest was called with invalid parameters: ", !!request, !!response, !!client);
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
                        properties["erorr"] = error;
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
}

/**
 * Helper class to read data from the requst/response objects and convert them into the telemetry contract
 */
class RequestDataHelper {
    private static keys = new ContractsModule.Contracts.ContextTagKeys();

    private method:string;
    private url:string;
    private startTime:number;
    private rawHeaders:string[];
    private socketRemoteAddress:string;
    private connectionRemoteAddress:string;
    private legacySocketRemoteAddress:string;

    private endTime:number;
    private statusCode:number;
    private errorProperties:{[key: string]:string};

    constructor(request:http.ServerRequest) {
        if (request) {
            this.method = request.method;
            this.url = request.url;
            this.startTime = +new Date();
            this.rawHeaders = request.headers || (<any>request).rawHeaders;
            this.socketRemoteAddress = (<any>request).socket && (<any>request).socket.remoteAddress;
            if (request.connection) {
                this.connectionRemoteAddress = request.connection.remoteAddress;
                this.legacySocketRemoteAddress = request.connection["socket"] && request.connection["socket"].remoteAddress;
            }
        }
    }

    public onResponse(response:http.ServerResponse, errorProperties?:{[key: string]: string}) {
        this.endTime = +new Date;
        this.statusCode = response.statusCode;
        this.errorProperties = errorProperties;
    }

    public getRequestData():ContractsModule.Contracts.Data<ContractsModule.Contracts.RequestData> {
        var duration = this.endTime - this.startTime;
        var requestData = new ContractsModule.Contracts.RequestData();
        requestData.httpMethod = this.method;
        requestData.id = Util.newGuid();
        requestData.name = this.method + " " + url.parse(this.url).pathname;
        requestData.startTime = Util.toISOStringForIE8(new Date(this.startTime));
        requestData.url = this.url;
        requestData.duration = Util.msToTimeSpan(duration);
        requestData.responseCode = this.statusCode.toString();
        requestData.success = this._isSuccess(this.statusCode);
        requestData.properties = this.errorProperties;

        var data = new ContractsModule.Contracts.Data<ContractsModule.Contracts.RequestData>();
        data.baseType = "Microsoft.ApplicationInsights.RequestData";
        data.baseData = requestData;

        return data;
    }

    public getRequestTags(tags:{[key: string]:string}):{[key: string]:string} {
        // create a copy of the context for requests since client info will be used here
        var newTags = <{[key: string]:string}>{};
        for (var key in tags) {
            newTags[key] = tags[key];
        }

        newTags[RequestDataHelper.keys.locationIp] = this._getIp();
        newTags[RequestDataHelper.keys.sessionId] = this._getSessionId();
        return newTags;
    }

    private _isSuccess(statusCode:number) {
        return (statusCode < 400) && !this.errorProperties; // todo: this could probably be improved
    }

    private _getIp() {

        // regex to match ipv4 without port
        // Note: including the port would cause the payload to be rejected by the data collector
        var ipMatch = /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/;

        var check = (str:string):string => {
            var results = ipMatch.exec(str);
            if (results) {
                return results[0];
            }
        };

        var ip = check(this.rawHeaders["x-forwarded-for"])
            || check(this.rawHeaders["x-client-ip"])
            || check(this.rawHeaders["x-real-ip"])
            || check(this.connectionRemoteAddress)
            || check(this.socketRemoteAddress)
            || check(this.legacySocketRemoteAddress);

        // node v12 returns this if the address is "localhost"
        if (!ip && this.connectionRemoteAddress === "::1") {
            ip = "127.0.0.1";
        }

        return ip;
    }

    private _getSessionId() {
        var name = "ai_session=";
        var value = "";
        if (this.rawHeaders && this.rawHeaders["cookie"] && typeof this.rawHeaders["cookie"].split === "function") {
            var cookies = this.rawHeaders["cookie"].split(";");
            for (var i = 0; i < cookies.length; i++) {
                var cookie = cookies[i];
                cookie = Util.trim(cookie);
                if (cookie && cookie.indexOf(name) === 0) {
                    value = cookie.substring(name.length, cookies[i].length);
                    break;
                }
            }
        }

        return value;
    }
}

export = AutoCollectRequests;