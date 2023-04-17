"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var http = require("http");
var https = require("https");
var Logging = require("../Library/Logging");
var Util = require("../Library/Util");
var RequestResponseHeaders = require("../Library/RequestResponseHeaders");
var HttpDependencyParser = require("./HttpDependencyParser");
var CorrelationContextManager_1 = require("./CorrelationContextManager");
var Traceparent = require("../Library/Traceparent");
var DiagChannel = require("./diagnostic-channel/initialization");
var CorrelationIdManager = require("../Library/CorrelationIdManager");
var AutoCollectHttpDependencies = /** @class */ (function () {
    function AutoCollectHttpDependencies(client) {
        if (!!AutoCollectHttpDependencies.INSTANCE) {
            throw new Error("Client request tracking should be configured from the applicationInsights object");
        }
        AutoCollectHttpDependencies.INSTANCE = this;
        this._client = client;
    }
    AutoCollectHttpDependencies.prototype.enable = function (isEnabled) {
        this._isEnabled = isEnabled;
        if (this._isEnabled && !this._isInitialized) {
            this._initialize();
        }
        if (DiagChannel.IsInitialized) {
            require("./diagnostic-channel/azure-coretracing.sub").enable(isEnabled, this._client);
            require("./diagnostic-channel/mongodb.sub").enable(isEnabled, this._client);
            require("./diagnostic-channel/mysql.sub").enable(isEnabled, this._client);
            require("./diagnostic-channel/redis.sub").enable(isEnabled, this._client);
            require("./diagnostic-channel/postgres.sub").enable(isEnabled, this._client);
        }
    };
    AutoCollectHttpDependencies.prototype.isInitialized = function () {
        return this._isInitialized;
    };
    AutoCollectHttpDependencies.prototype._initialize = function () {
        var _this = this;
        this._isInitialized = true;
        var originalRequest = http.request;
        var originalHttpsRequest = https.request;
        var clientRequestPatch = function (request, options) {
            try {
                var shouldCollect = !options[AutoCollectHttpDependencies.disableCollectionRequestOption] &&
                    !request[AutoCollectHttpDependencies.alreadyAutoCollectedFlag];
                // If someone else patched traceparent headers onto this request
                var userAgentHeader = null;
                // Azure SDK special handling
                if (options.headers) {
                    userAgentHeader = options.headers["User-Agent"] || options.headers["user-agent"];
                    if (userAgentHeader && userAgentHeader.toString().indexOf("azsdk-js") !== -1) {
                        shouldCollect = false;
                    }
                }
                if (request && options && shouldCollect) {
                    CorrelationContextManager_1.CorrelationContextManager.wrapEmitter(request);
                    if (_this._isEnabled) {
                        // Mark as auto collected
                        request[AutoCollectHttpDependencies.alreadyAutoCollectedFlag] = true;
                        // If there is no context create one, this apply when no request is triggering the dependency
                        if (!CorrelationContextManager_1.CorrelationContextManager.getCurrentContext()) {
                            // Create correlation context and wrap execution
                            var operationId = null;
                            if (CorrelationIdManager.w3cEnabled) {
                                var traceparent = new Traceparent();
                                operationId = traceparent.traceId;
                            }
                            else {
                                var requestId = CorrelationIdManager.generateRequestId(null);
                                operationId = CorrelationIdManager.getRootId(requestId);
                            }
                            var correlationContext = CorrelationContextManager_1.CorrelationContextManager.generateContextObject(operationId);
                            CorrelationContextManager_1.CorrelationContextManager.runWithContext(correlationContext, function () {
                                AutoCollectHttpDependencies.trackRequest(_this._client, { options: options, request: request });
                            });
                        }
                        else {
                            AutoCollectHttpDependencies.trackRequest(_this._client, { options: options, request: request });
                        }
                    }
                }
            }
            catch (err) {
                Logging.warn("Failed to generate dependency telemetry.", Util.dumpObj(err));
            }
        };
        // On node >= v0.11.12 and < 9.0 (excluding 8.9.0) https.request just calls http.request (with additional options).
        // On node < 0.11.12, 8.9.0, and 9.0 > https.request is handled separately
        // Patch both and leave a flag to not double-count on versions that just call through
        // We add the flag to both http and https to protect against strange double collection in other scenarios
        http.request = function (options) {
            var requestArgs = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                requestArgs[_i - 1] = arguments[_i];
            }
            var request = originalRequest.call.apply(originalRequest, __spreadArrays([http, options], requestArgs));
            clientRequestPatch(request, options);
            return request;
        };
        https.request = function (options) {
            var requestArgs = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                requestArgs[_i - 1] = arguments[_i];
            }
            var request = originalHttpsRequest.call.apply(originalHttpsRequest, __spreadArrays([https, options], requestArgs));
            clientRequestPatch(request, options);
            return request;
        };
        // Node 8 calls http.request from http.get using a local reference!
        // We have to patch .get manually in this case and can't just assume request is enough
        // We have to replace the entire method in this case. We can't call the original.
        // This is because calling the original will give us no chance to set headers as it internally does .end().
        http.get = function (options) {
            var _a;
            var requestArgs = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                requestArgs[_i - 1] = arguments[_i];
            }
            var request = (_a = http.request).call.apply(_a, __spreadArrays([http, options], requestArgs));
            request.end();
            return request;
        };
        https.get = function (options) {
            var _a;
            var requestArgs = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                requestArgs[_i - 1] = arguments[_i];
            }
            var request = (_a = https.request).call.apply(_a, __spreadArrays([https, options], requestArgs));
            request.end();
            return request;
        };
    };
    /**
     * Tracks an outgoing request. Because it may set headers this method must be called before
     * writing content to or ending the request.
     */
    AutoCollectHttpDependencies.trackRequest = function (client, telemetry) {
        if (!telemetry.options || !telemetry.request || !client) {
            Logging.info("AutoCollectHttpDependencies.trackRequest was called with invalid parameters: ", !telemetry.options, !telemetry.request, !client);
            return;
        }
        var requestParser = new HttpDependencyParser(telemetry.options, telemetry.request);
        var currentContext = CorrelationContextManager_1.CorrelationContextManager.getCurrentContext();
        var uniqueRequestId;
        var uniqueTraceparent;
        if (currentContext && currentContext.operation && currentContext.operation.traceparent && Traceparent.isValidTraceId(currentContext.operation.traceparent.traceId)) {
            currentContext.operation.traceparent.updateSpanId();
            uniqueRequestId = currentContext.operation.traceparent.getBackCompatRequestId();
        }
        else if (CorrelationIdManager.w3cEnabled) {
            // Start an operation now so that we can include the w3c headers in the outgoing request
            var traceparent = new Traceparent();
            uniqueTraceparent = traceparent.toString();
            uniqueRequestId = traceparent.getBackCompatRequestId();
        }
        else {
            uniqueRequestId = currentContext && currentContext.operation && (currentContext.operation.parentId + AutoCollectHttpDependencies.requestNumber++ + ".");
        }
        // Add the source correlationId to the request headers, if a value was not already provided.
        // The getHeader/setHeader methods aren't available on very old Node versions, and
        // are not included in the v0.10 type declarations currently used. So check if the
        // methods exist before invoking them.
        if (Util.canIncludeCorrelationHeader(client, requestParser.getUrl()) && telemetry.request.getHeader && telemetry.request.setHeader) {
            if (client.config && client.config.correlationId) {
                // getHeader returns "any" type in newer versions of node. In basic scenarios, this will be <string | string[] | number>, but could be modified to anything else via middleware
                var correlationHeader = telemetry.request.getHeader(RequestResponseHeaders.requestContextHeader);
                try {
                    Util.safeIncludeCorrelationHeader(client, telemetry.request, correlationHeader);
                }
                catch (err) {
                    Logging.warn("Request-Context header could not be set. Correlation of requests may be lost", err);
                }
                if (currentContext && currentContext.operation) {
                    try {
                        telemetry.request.setHeader(RequestResponseHeaders.requestIdHeader, uniqueRequestId);
                        // Also set legacy headers
                        if (!client.config.ignoreLegacyHeaders) {
                            telemetry.request.setHeader(RequestResponseHeaders.parentIdHeader, currentContext.operation.id);
                            telemetry.request.setHeader(RequestResponseHeaders.rootIdHeader, uniqueRequestId);
                        }
                        // Set W3C headers, if available
                        if (uniqueTraceparent || currentContext.operation.traceparent) {
                            telemetry.request.setHeader(RequestResponseHeaders.traceparentHeader, uniqueTraceparent || currentContext.operation.traceparent.toString());
                        }
                        else if (CorrelationIdManager.w3cEnabled) {
                            // should never get here since we set uniqueTraceparent above for the w3cEnabled scenario
                            var traceparent = new Traceparent().toString();
                            telemetry.request.setHeader(RequestResponseHeaders.traceparentHeader, traceparent);
                        }
                        if (currentContext.operation.tracestate) {
                            var tracestate = currentContext.operation.tracestate.toString();
                            if (tracestate) {
                                telemetry.request.setHeader(RequestResponseHeaders.traceStateHeader, tracestate);
                            }
                        }
                        var correlationContextHeader = currentContext.customProperties.serializeToHeader();
                        if (correlationContextHeader) {
                            telemetry.request.setHeader(RequestResponseHeaders.correlationContextHeader, correlationContextHeader);
                        }
                    }
                    catch (err) {
                        Logging.warn("Correlation headers could not be set. Correlation of requests may be lost.", err);
                    }
                }
            }
        }
        // Collect dependency telemetry about the request when it finishes.
        if (telemetry.request.on) {
            telemetry.request.on("response", function (response) {
                if (telemetry.isProcessed) {
                    return;
                }
                telemetry.isProcessed = true;
                requestParser.onResponse(response);
                var dependencyTelemetry = requestParser.getDependencyTelemetry(telemetry, uniqueRequestId);
                dependencyTelemetry.contextObjects = dependencyTelemetry.contextObjects || {};
                dependencyTelemetry.contextObjects["http.RequestOptions"] = telemetry.options;
                dependencyTelemetry.contextObjects["http.ClientRequest"] = telemetry.request;
                dependencyTelemetry.contextObjects["http.ClientResponse"] = response;
                client.trackDependency(dependencyTelemetry);
            });
            telemetry.request.on("error", function (error) {
                if (telemetry.isProcessed) {
                    return;
                }
                telemetry.isProcessed = true;
                requestParser.onError(error);
                var dependencyTelemetry = requestParser.getDependencyTelemetry(telemetry, uniqueRequestId);
                dependencyTelemetry.contextObjects = dependencyTelemetry.contextObjects || {};
                dependencyTelemetry.contextObjects["http.RequestOptions"] = telemetry.options;
                dependencyTelemetry.contextObjects["http.ClientRequest"] = telemetry.request;
                dependencyTelemetry.contextObjects["Error"] = error;
                client.trackDependency(dependencyTelemetry);
            });
            telemetry.request.on("abort", function () {
                if (telemetry.isProcessed) {
                    return;
                }
                telemetry.isProcessed = true;
                requestParser.onError(new Error("The request has been aborted and the network socket has closed."));
                var dependencyTelemetry = requestParser.getDependencyTelemetry(telemetry, uniqueRequestId);
                dependencyTelemetry.contextObjects = dependencyTelemetry.contextObjects || {};
                dependencyTelemetry.contextObjects["http.RequestOptions"] = telemetry.options;
                dependencyTelemetry.contextObjects["http.ClientRequest"] = telemetry.request;
                client.trackDependency(dependencyTelemetry);
            });
        }
    };
    AutoCollectHttpDependencies.prototype.dispose = function () {
        AutoCollectHttpDependencies.INSTANCE = null;
        this.enable(false);
        this._isInitialized = false;
    };
    AutoCollectHttpDependencies.disableCollectionRequestOption = "disableAppInsightsAutoCollection";
    AutoCollectHttpDependencies.requestNumber = 1;
    AutoCollectHttpDependencies.alreadyAutoCollectedFlag = "_appInsightsAutoCollected";
    return AutoCollectHttpDependencies;
}());
module.exports = AutoCollectHttpDependencies;
//# sourceMappingURL=HttpDependencies.js.map