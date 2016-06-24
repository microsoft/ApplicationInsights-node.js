///<reference path="..\Declarations\node\node.d.ts" />

import http = require("http");
import url = require("url");

import ContractsModule = require("../Library/Contracts");
import Client = require("../Library/Client");
import Logging = require("../Library/Logging");
import Util = require("../Library/Util");

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
    private userAgent: string;

    private duration:number;
    private statusCode:number;
    private properties:{[key: string]:string};

    constructor(request:http.ServerRequest) {
        if (request) {
            this.method = request.method;
            this.url = this._getAbsoluteUrl(request);
            this.startTime = +new Date();
            this.rawHeaders = request.headers || (<any>request).rawHeaders;
            this.socketRemoteAddress = (<any>request).socket && (<any>request).socket.remoteAddress;
            this.userAgent = request.headers && request.headers["user-agent"];
            if (request.connection) {
                this.connectionRemoteAddress = request.connection.remoteAddress;
                this.legacySocketRemoteAddress = request.connection["socket"] && request.connection["socket"].remoteAddress;
            }
        }
    }

    public onResponse(response:http.ServerResponse, properties?:{[key: string]: string}, ellapsedMilliseconds?: number) {
        if (ellapsedMilliseconds) {
            this.duration = ellapsedMilliseconds;
        } else {
            var endTime = +new Date();
            this.duration = endTime - this.startTime;
        }
        
        this.statusCode = response.statusCode;
        this.properties = properties;
    }

    public getRequestData():ContractsModule.Contracts.Data<ContractsModule.Contracts.RequestData> {
        var requestData = new ContractsModule.Contracts.RequestData();
        requestData.httpMethod = this.method;
        requestData.id = Util.newGuid();
        requestData.name = this.method + " " + url.parse(this.url).pathname;
        requestData.startTime = (new Date(this.startTime)).toISOString();
        requestData.url = this.url;
        requestData.duration = Util.msToTimeSpan(this.duration);
        requestData.responseCode = this.statusCode ? this.statusCode.toString() : null;
        requestData.success = this._isSuccess(this.statusCode);
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

        newTags[RequestDataHelper.keys.locationIp] = this._getIp();
        newTags[RequestDataHelper.keys.sessionId] = this._getId("ai_session");
        newTags[RequestDataHelper.keys.userId] = this._getId("ai_user");
        newTags[RequestDataHelper.keys.userAgent] = this.userAgent;
        newTags[RequestDataHelper.keys.operationName] = this.method + " " + url.parse(this.url).pathname;
        
        return newTags;
    }

    private _isSuccess(statusCode:number) {
        return statusCode && (statusCode < 400); // todo: this could probably be improved
    }
    
    private _getAbsoluteUrl(request:http.ServerRequest):string {
        if (!request.headers) {
            return request.url;
        }
        
        var encrypted = <any>request.connection ? (<any>request.connection).encrypted : null;
        var pathName = request.url.split('?')[0];
        var search = request.url.indexOf('?') != -1 ? request.url.substring(request.url.indexOf('?')) : null;
        
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
        var value = RequestDataHelper.parseId(Util.getCookie(name, cookie));
        return value;
    }
  
    public static parseId(cookieValue: string): string{
        return cookieValue.substr(0, cookieValue.indexOf('|'));
    }
}

export = RequestDataHelper;