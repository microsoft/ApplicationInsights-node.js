///<reference path="..\typings\globals\node\index.d.ts" />

import http = require("http");
import url = require("url");

import ContractsModule = require("../Library/Contracts");
import Client = require("../Library/Client");
import Logging = require("../Library/Logging");
import Util = require("../Library/Util");
import RequestResponseHeaders = require("../Library/RequestResponseHeaders");
import RequestParser = require("./RequestParser");

/**
 * Helper class to read data from the requst/response objects and convert them into the telemetry contract
 */
class ServerRequestParser extends RequestParser {
    private static keys = new ContractsModule.Contracts.ContextTagKeys();

    private rawHeaders:string[];
    private socketRemoteAddress:string;
    private connectionRemoteAddress:string;
    private legacySocketRemoteAddress:string;
    private userAgent: string;
    private sourceIKeyHash: string;
    private parentId: string;
    private operationId: string;

    constructor(request:http.ServerRequest) {
        super();
        if (request) {
            this.method = request.method;
            this.url = this._getAbsoluteUrl(request);
            this.startTime = +new Date();
            this.rawHeaders = request.headers || (<any>request).rawHeaders;
            this.socketRemoteAddress = (<any>request).socket && (<any>request).socket.remoteAddress;
            this.userAgent = request.headers && request.headers["user-agent"];
            this.sourceIKeyHash =
                request.headers && request.headers[RequestResponseHeaders.sourceInstrumentationKeyHeader];
            this.parentId =
                request.headers && request.headers[RequestResponseHeaders.parentIdHeader];
            this.operationId =
                request.headers && request.headers[RequestResponseHeaders.rootIdHeader];
            if (request.connection) {
                this.connectionRemoteAddress = request.connection.remoteAddress;
                this.legacySocketRemoteAddress = request.connection["socket"] && request.connection["socket"].remoteAddress;
            }
        }
    }

    public onError(error: Error | string, properties?:{[key: string]: string}, ellapsedMilliseconds?: number) {
        this._setStatus(undefined, error, properties);
    }

    public onResponse(response:http.ServerResponse, properties?:{[key: string]: string}, ellapsedMilliseconds?: number) {
        this._setStatus(response.statusCode, undefined, properties);

        if (ellapsedMilliseconds) {
            this.duration = ellapsedMilliseconds;
        }
    }

    public getRequestData():ContractsModule.Contracts.Data<ContractsModule.Contracts.RequestData> {
        var requestData = new ContractsModule.Contracts.RequestData();
        requestData.id = Util.newGuid();
        requestData.name = this.method + " " + url.parse(this.url).pathname;
        requestData.url = this.url;
        requestData.source = this.sourceIKeyHash;
        requestData.duration = Util.msToTimeSpan(this.duration);
        requestData.responseCode = this.statusCode ? this.statusCode.toString() : null;
        requestData.success = this._isSuccess();
        requestData.properties = this.properties;

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

        // don't override tags if they are already set
        newTags[ServerRequestParser.keys.locationIp] = tags[ServerRequestParser.keys.locationIp] || this._getIp();
        newTags[ServerRequestParser.keys.sessionId] = tags[ServerRequestParser.keys.sessionId] || this._getId("ai_session");
        newTags[ServerRequestParser.keys.userId] = tags[ServerRequestParser.keys.userId] || this._getId("ai_user");
        newTags[ServerRequestParser.keys.userAgent] = tags[ServerRequestParser.keys.userAgent] || this.userAgent;
        newTags[ServerRequestParser.keys.operationName] = tags[ServerRequestParser.keys.operationName] || this.method + " " + url.parse(this.url).pathname;
        newTags[ServerRequestParser.keys.operationParentId] = tags[ServerRequestParser.keys.operationParentId] || this.parentId;
        newTags[ServerRequestParser.keys.operationId] = tags[ServerRequestParser.keys.operationId] || this.operationId;

        return newTags;
    }

    private _getAbsoluteUrl(request:http.ServerRequest):string {
        if (!request.headers) {
            return request.url;
        }

        var encrypted = <any>request.connection ? (<any>request.connection).encrypted : null;
        var requestUrl = url.parse(request.url);

        var pathName = requestUrl.pathname;
        var search = requestUrl.search;

        var absoluteUrl = url.format({
            protocol: encrypted ? "https" : "http",
            host: request.headers.host,
            pathname: pathName,
            search: search
        });

        return absoluteUrl;
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
        if (!ip
            && this.connectionRemoteAddress
            && this.connectionRemoteAddress.substr
            && this.connectionRemoteAddress.substr(0, 2) === "::") {
            ip = "127.0.0.1";
        }

        return ip;
    }

    private _getId(name: string) {
        var cookie = (this.rawHeaders && this.rawHeaders["cookie"] &&
            typeof this.rawHeaders["cookie"] === 'string' && this.rawHeaders["cookie"]) || "";
        var value = ServerRequestParser.parseId(Util.getCookie(name, cookie));
        return value;
    }

    public static parseId(cookieValue: string): string{
        return cookieValue.substr(0, cookieValue.indexOf('|'));
    }
}

export = ServerRequestParser;