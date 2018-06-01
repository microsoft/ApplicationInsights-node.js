import http = require("http");
import url = require("url");

import Contracts = require("../Declarations/Contracts");
import TelemetryClient = require("../Library/TelemetryClient");
import Logging = require("../Library/Logging");
import Util = require("../Library/Util");
import RequestResponseHeaders = require("../Library/RequestResponseHeaders");
import RequestParser = require("./RequestParser");
import CorrelationIdManager = require("../Library/CorrelationIdManager");

/**
 * Helper class to read data from the requst/response objects and convert them into the telemetry contract
 */
class HttpRequestParser extends RequestParser {
    private static keys = new Contracts.ContextTagKeys();

    private rawHeaders: { [key: string]: string };
    private socketRemoteAddress: string;
    private connectionRemoteAddress: string;
    private legacySocketRemoteAddress: string;
    private userAgent: string;
    private sourceCorrelationId: string;
    private parentId: string;
    private operationId: string;
    private requestId: string;

    private correlationContextHeader: string;

    constructor(request: http.ServerRequest, requestId?: string) {
        super();
        if (request) {
            this.method = request.method;
            this.url = this._getAbsoluteUrl(request);
            this.startTime = +new Date();
            this.socketRemoteAddress = (<any>request).socket && (<any>request).socket.remoteAddress;
            this.parseHeaders(request, requestId);
            if (request.connection) {
                this.connectionRemoteAddress = request.connection.remoteAddress;
                this.legacySocketRemoteAddress = (<any>request.connection)["socket"] && (<any>request.connection)["socket"].remoteAddress;
            }
        }
    }

    public onError(error: Error | string, ellapsedMilliseconds?: number) {
        this._setStatus(undefined, error);

        // This parameter is only for overrides. setStatus handles this internally for the autocollected case
        if (ellapsedMilliseconds) {
            this.duration = ellapsedMilliseconds;
        }
    }

    public onResponse(response: http.ServerResponse, ellapsedMilliseconds?: number) {
        this._setStatus(response.statusCode, undefined);

        // This parameter is only for overrides. setStatus handles this internally for the autocollected case
        if (ellapsedMilliseconds) {
            this.duration = ellapsedMilliseconds;
        }
    }

    public getRequestTelemetry(baseTelemetry?: Contracts.Telemetry): Contracts.RequestTelemetry {
        var requestTelemetry: Contracts.RequestTelemetry & Contracts.Identified = {
            id: this.requestId,
            name: this.method + " " + url.parse(this.url).pathname,
            url: this.url,
            /*
            See https://github.com/Microsoft/ApplicationInsights-dotnet-server/blob/25d695e6a906fbe977f67be3966d25dbf1c50a79/Src/Web/Web.Shared.Net/RequestTrackingTelemetryModule.cs#L250
            for reference
            */
            source: this.sourceCorrelationId,
            duration: this.duration,
            resultCode: this.statusCode ? this.statusCode.toString() : null,
            success: this._isSuccess(),
            properties: this.properties
        };

        // We should keep any parameters the user passed in
        // Except the fields defined above in requestTelemetry, which take priority
        // Except the properties field, where they're merged instead, with baseTelemetry taking priority
        if (baseTelemetry) {
            // Copy missing fields
            for (let key in baseTelemetry) {
                if (!(<any>requestTelemetry)[key]) {
                    (<any>requestTelemetry)[key] = (<any>baseTelemetry)[key];
                }
            }
            // Merge properties
            if (baseTelemetry.properties) {
                for (let key in baseTelemetry.properties) {
                    requestTelemetry.properties[key] = baseTelemetry.properties[key];
                }
            }
        }

        return requestTelemetry;
    }

    public getRequestTags(tags: { [key: string]: string }): { [key: string]: string } {
        // create a copy of the context for requests since client info will be used here
        var newTags = <{ [key: string]: string }>{};
        for (var key in tags) {
            newTags[key] = tags[key];
        }

        // don't override tags if they are already set
        newTags[HttpRequestParser.keys.locationIp] = tags[HttpRequestParser.keys.locationIp] || this._getIp();
        newTags[HttpRequestParser.keys.sessionId] = tags[HttpRequestParser.keys.sessionId] || this._getId("ai_session");
        newTags[HttpRequestParser.keys.userId] = tags[HttpRequestParser.keys.userId] || this._getId("ai_user");
        newTags[HttpRequestParser.keys.userAuthUserId] = tags[HttpRequestParser.keys.userAuthUserId] || this._getId("ai_authUser");
        newTags[HttpRequestParser.keys.operationName] = this.getOperationName(tags);
        newTags[HttpRequestParser.keys.operationParentId] = this.getOperationParentId(tags);
        newTags[HttpRequestParser.keys.operationId] = this.getOperationId(tags);

        return newTags;
    }

    public getOperationId(tags: { [key: string]: string }) {
        return tags[HttpRequestParser.keys.operationId] || this.operationId;
    }

    public getOperationParentId(tags: { [key: string]: string }) {
        return tags[HttpRequestParser.keys.operationParentId] || this.parentId || this.getOperationId(tags);
    }

    public getOperationName(tags: { [key: string]: string }) {
        return tags[HttpRequestParser.keys.operationName] || this.method + " " + url.parse(this.url).pathname;
    }

    public getRequestId() {
        return this.requestId;
    }

    public getCorrelationContextHeader() {
        return this.correlationContextHeader;
    }

    private _getAbsoluteUrl(request: http.ServerRequest): string {
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

        var check = (str: string): string => {
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
        var value = HttpRequestParser.parseId(Util.getCookie(name, cookie));
        return value;
    }

    private parseHeaders(request: http.ServerRequest, requestId?: string) {
        this.rawHeaders = request.headers || (<any>request).rawHeaders;
        this.userAgent = request.headers && request.headers["user-agent"];
        this.sourceCorrelationId = Util.getCorrelationContextTarget(request, RequestResponseHeaders.requestContextSourceKey);

        if (request.headers) {
            this.correlationContextHeader = request.headers[RequestResponseHeaders.correlationContextHeader];

            if (request.headers[RequestResponseHeaders.requestIdHeader]) {
                this.parentId = request.headers[RequestResponseHeaders.requestIdHeader];
                this.requestId = CorrelationIdManager.generateRequestId(this.parentId);
                this.correlationContextHeader = request.headers[RequestResponseHeaders.correlationContextHeader];
            } else {
                // Legacy fallback
                const rootId = request.headers[RequestResponseHeaders.rootIdHeader];
                this.parentId = request.headers[RequestResponseHeaders.parentIdHeader];
                this.requestId = CorrelationIdManager.generateRequestId(rootId || this.parentId);
                this.correlationContextHeader = null;
            }
            if (requestId) {
                // For the scenarios that don't guarantee an AI-created context,
                // override the requestId with the provided one.
                this.requestId = requestId;
            }
            this.operationId = CorrelationIdManager.getRootId(this.requestId);
        }
    }

    public static parseId(cookieValue: string): string {
        return cookieValue.substr(0, cookieValue.indexOf('|'));
    }
}

export = HttpRequestParser;
