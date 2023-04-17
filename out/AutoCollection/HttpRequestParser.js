"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var url = require("url");
var Contracts = require("../Declarations/Contracts");
var Util = require("../Library/Util");
var RequestResponseHeaders = require("../Library/RequestResponseHeaders");
var RequestParser = require("./RequestParser");
var CorrelationIdManager = require("../Library/CorrelationIdManager");
var Tracestate = require("../Library/Tracestate");
var Traceparent = require("../Library/Traceparent");
/**
 * Helper class to read data from the request/response objects and convert them into the telemetry contract
 */
var HttpRequestParser = /** @class */ (function (_super) {
    __extends(HttpRequestParser, _super);
    function HttpRequestParser(request, requestId) {
        var _this = _super.call(this) || this;
        if (request) {
            _this.method = request.method;
            _this.url = _this._getAbsoluteUrl(request);
            _this.startTime = +new Date();
            _this.socketRemoteAddress = request.socket && request.socket.remoteAddress;
            _this.parseHeaders(request, requestId);
            if (request.connection) {
                _this.connectionRemoteAddress = request.connection.remoteAddress;
                _this.legacySocketRemoteAddress = request.connection["socket"] && request.connection["socket"].remoteAddress;
            }
        }
        return _this;
    }
    HttpRequestParser.prototype.onError = function (error, ellapsedMilliseconds) {
        this._setStatus(undefined, error);
        // This parameter is only for overrides. setStatus handles this internally for the autocollected case
        if (ellapsedMilliseconds) {
            this.duration = ellapsedMilliseconds;
        }
    };
    HttpRequestParser.prototype.onResponse = function (response, ellapsedMilliseconds) {
        this._setStatus(response.statusCode, undefined);
        // This parameter is only for overrides. setStatus handles this internally for the autocollected case
        if (ellapsedMilliseconds) {
            this.duration = ellapsedMilliseconds;
        }
    };
    HttpRequestParser.prototype.getRequestTelemetry = function (baseTelemetry) {
        var name = this.method;
        try {
            name += " " + new url.URL(this.url).pathname;
        }
        catch (ex) { // Invalid URL
            // Ignore error
        }
        var requestTelemetry = {
            id: this.requestId,
            name: name,
            url: this.url,
            /*
            See https://github.com/microsoft/ApplicationInsights-dotnet-server/blob/25d695e6a906fbe977f67be3966d25dbf1c50a79/Src/Web/Web.Shared.Net/RequestTrackingTelemetryModule.cs#L250
            for reference
            */
            source: this.sourceCorrelationId,
            duration: this.duration,
            resultCode: this.statusCode ? this.statusCode.toString() : null,
            success: this._isSuccess(),
            properties: this.properties
        };
        if (baseTelemetry && baseTelemetry.time) {
            requestTelemetry.time = baseTelemetry.time;
        }
        else if (this.startTime) {
            requestTelemetry.time = new Date(this.startTime);
        }
        // We should keep any parameters the user passed in
        // Except the fields defined above in requestTelemetry, which take priority
        // Except the properties field, where they're merged instead, with baseTelemetry taking priority
        if (baseTelemetry) {
            // Copy missing fields
            for (var key in baseTelemetry) {
                if (!requestTelemetry[key]) {
                    requestTelemetry[key] = baseTelemetry[key];
                }
            }
            // Merge properties
            if (baseTelemetry.properties) {
                for (var key in baseTelemetry.properties) {
                    requestTelemetry.properties[key] = baseTelemetry.properties[key];
                }
            }
        }
        return requestTelemetry;
    };
    HttpRequestParser.prototype.getRequestTags = function (tags) {
        // create a copy of the context for requests since client info will be used here
        var newTags = {};
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
    };
    HttpRequestParser.prototype.getOperationId = function (tags) {
        return tags[HttpRequestParser.keys.operationId] || this.operationId;
    };
    HttpRequestParser.prototype.getOperationParentId = function (tags) {
        return tags[HttpRequestParser.keys.operationParentId] || this.parentId || this.getOperationId(tags);
    };
    HttpRequestParser.prototype.getOperationName = function (tags) {
        if (tags[HttpRequestParser.keys.operationName]) {
            return tags[HttpRequestParser.keys.operationName];
        }
        var pathName = "";
        try {
            pathName = new url.URL(this.url).pathname;
        }
        catch (ex) { // Invalid URL
            // Ignore error
        }
        var operationName = this.method;
        if (pathName) {
            operationName += " " + pathName;
        }
        return operationName;
    };
    HttpRequestParser.prototype.getRequestId = function () {
        return this.requestId;
    };
    HttpRequestParser.prototype.getCorrelationContextHeader = function () {
        return this.correlationContextHeader;
    };
    HttpRequestParser.prototype.getTraceparent = function () {
        return this.traceparent;
    };
    HttpRequestParser.prototype.getTracestate = function () {
        return this.tracestate;
    };
    HttpRequestParser.prototype.getLegacyRootId = function () {
        return this.legacyRootId;
    };
    HttpRequestParser.prototype._getAbsoluteUrl = function (request) {
        if (!request.headers) {
            return request.url;
        }
        var encrypted = request.connection ? request.connection.encrypted : null;
        var protocol = (encrypted || request.headers["x-forwarded-proto"] == "https") ? "https" : "http";
        var baseUrl = protocol + "://" + request.headers.host + "/";
        var pathName = "";
        var search = "";
        try {
            var requestUrl = new url.URL(request.url, baseUrl);
            pathName = requestUrl.pathname;
            search = requestUrl.search;
        }
        catch (ex) {
            // Ignore errors
        }
        var absoluteUrl = url.format({
            protocol: protocol,
            host: request.headers.host,
            pathname: pathName,
            search: search
        });
        return absoluteUrl;
    };
    HttpRequestParser.prototype._getIp = function () {
        // regex to match ipv4 without port
        // Note: including the port would cause the payload to be rejected by the data collector
        var ipMatch = /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/;
        var check = function (str) {
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
    };
    HttpRequestParser.prototype._getId = function (name) {
        var cookie = (this.rawHeaders && this.rawHeaders["cookie"] &&
            typeof this.rawHeaders["cookie"] === "string" && this.rawHeaders["cookie"]) || "";
        var value = HttpRequestParser.parseId(Util.getCookie(name, cookie));
        return value;
    };
    /**
     * Sets this operation's operationId, parentId, requestId (and legacyRootId, if necessary) based on this operation's traceparent
     */
    HttpRequestParser.prototype.setBackCompatFromThisTraceContext = function () {
        // Set operationId
        this.operationId = this.traceparent.traceId;
        if (this.traceparent.legacyRootId) {
            this.legacyRootId = this.traceparent.legacyRootId;
        }
        // Set parentId with existing spanId
        this.parentId = this.traceparent.parentId;
        // Update the spanId and set the current requestId
        this.traceparent.updateSpanId();
        this.requestId = this.traceparent.getBackCompatRequestId();
    };
    HttpRequestParser.prototype.parseHeaders = function (request, requestId) {
        this.rawHeaders = request.headers || request.rawHeaders;
        this.userAgent = request.headers && request.headers["user-agent"];
        this.sourceCorrelationId = Util.getCorrelationContextTarget(request, RequestResponseHeaders.requestContextSourceKey);
        if (request.headers) {
            var tracestateHeader = request.headers[RequestResponseHeaders.traceStateHeader] ? request.headers[RequestResponseHeaders.traceStateHeader].toString() : null; // w3c header
            var traceparentHeader = request.headers[RequestResponseHeaders.traceparentHeader] ? request.headers[RequestResponseHeaders.traceparentHeader].toString() : null; // w3c header
            var requestIdHeader = request.headers[RequestResponseHeaders.requestIdHeader] ? request.headers[RequestResponseHeaders.requestIdHeader].toString() : null; // default AI header
            var legacy_parentId = request.headers[RequestResponseHeaders.parentIdHeader] ? request.headers[RequestResponseHeaders.parentIdHeader].toString() : null; // legacy AI header
            var legacy_rootId = request.headers[RequestResponseHeaders.rootIdHeader] ? request.headers[RequestResponseHeaders.rootIdHeader].toString() : null; // legacy AI header
            this.correlationContextHeader = request.headers[RequestResponseHeaders.correlationContextHeader] ? request.headers[RequestResponseHeaders.correlationContextHeader].toString() : null;
            if (CorrelationIdManager.w3cEnabled && (traceparentHeader || tracestateHeader)) {
                // Parse W3C Trace Context headers
                this.traceparent = new Traceparent(traceparentHeader ? traceparentHeader.toString() : null); // new traceparent is always created from this
                this.tracestate = traceparentHeader && tracestateHeader && new Tracestate(tracestateHeader ? tracestateHeader.toString() : null); // discard tracestate if no traceparent is present
                this.setBackCompatFromThisTraceContext();
            }
            else if (requestIdHeader) {
                // Parse AI headers
                if (CorrelationIdManager.w3cEnabled) {
                    this.traceparent = new Traceparent(null, requestIdHeader);
                    this.setBackCompatFromThisTraceContext();
                }
                else {
                    this.parentId = requestIdHeader;
                    this.requestId = CorrelationIdManager.generateRequestId(this.parentId);
                    this.operationId = CorrelationIdManager.getRootId(this.requestId);
                }
            }
            else {
                // Legacy fallback
                if (CorrelationIdManager.w3cEnabled) {
                    this.traceparent = new Traceparent();
                    this.traceparent.parentId = legacy_parentId;
                    this.traceparent.legacyRootId = legacy_rootId || legacy_parentId;
                    this.setBackCompatFromThisTraceContext();
                }
                else {
                    this.parentId = legacy_parentId;
                    this.requestId = CorrelationIdManager.generateRequestId(legacy_rootId || this.parentId);
                    this.correlationContextHeader = null;
                    this.operationId = CorrelationIdManager.getRootId(this.requestId);
                }
            }
            if (requestId) {
                // For the scenarios that don't guarantee an AI-created context,
                // override the requestId with the provided one.
                this.requestId = requestId;
                this.operationId = CorrelationIdManager.getRootId(this.requestId);
            }
        }
    };
    HttpRequestParser.parseId = function (cookieValue) {
        var cookieParts = cookieValue.split("|");
        if (cookieParts.length > 0) {
            return cookieParts[0];
        }
        return ""; // old behavior was to return "" for incorrect parsing
    };
    HttpRequestParser.keys = new Contracts.ContextTagKeys();
    return HttpRequestParser;
}(RequestParser));
module.exports = HttpRequestParser;
//# sourceMappingURL=HttpRequestParser.js.map