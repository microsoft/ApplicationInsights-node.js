import http = require("http");
import https = require("https");
import Contracts = require("../Declarations/Contracts");
import TelemetryClient = require("../Library/TelemetryClient");
import Logging = require("../Library/Logging");
import Util = require("../Library/Util");
import RequestResponseHeaders = require("../Library/RequestResponseHeaders");
import HttpDependencyParser = require("./HttpDependencyParser");
import { CorrelationContextManager, PrivateCustomProperties } from "./CorrelationContextManager";
import Traceparent = require("../Library/Traceparent");
import * as DiagChannel from "./diagnostic-channel/initialization";
import CorrelationIdManager = require("../Library/CorrelationIdManager");

class AutoCollectHttpDependencies {
    public static disableCollectionRequestOption = "disableAppInsightsAutoCollection";

    public static INSTANCE: AutoCollectHttpDependencies;

    private static requestNumber = 1;
    private static alreadyAutoCollectedFlag = "_appInsightsAutoCollected";

    private _client: TelemetryClient;
    private _isEnabled: boolean;
    private _isInitialized: boolean;

    constructor(client: TelemetryClient) {
        if (!!AutoCollectHttpDependencies.INSTANCE) {
            throw new Error("Client request tracking should be configured from the applicationInsights object");
        }

        AutoCollectHttpDependencies.INSTANCE = this;
        this._client = client;
    }

    public enable(isEnabled: boolean) {
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
    }

    public isInitialized() {
        return this._isInitialized;
    }

    private _initialize() {
        this._isInitialized = true;

        const originalRequest = http.request;
        const originalHttpsRequest = https.request;

        const clientRequestPatch = (request: http.ClientRequest, options: string | URL | http.RequestOptions | https.RequestOptions) => {
            try {
                var shouldCollect = !(<any>options)[AutoCollectHttpDependencies.disableCollectionRequestOption] &&
                    !(<any>request)[AutoCollectHttpDependencies.alreadyAutoCollectedFlag];

                // If someone else patched traceparent headers onto this request
                let userAgentHeader = null;

                // Azure SDK special handling
                if ((<any>options).headers) {
                    userAgentHeader = (<any>options).headers["User-Agent"] || (<any>options).headers["user-agent"];
                    if (userAgentHeader && userAgentHeader.toString().indexOf("azsdk-js") !== -1) {
                        shouldCollect = false;
                    }
                }

                if (request && options && shouldCollect) {
                    CorrelationContextManager.wrapEmitter(request);
                    if (this._isEnabled) {
                        // Mark as auto collected
                        (<any>request)[AutoCollectHttpDependencies.alreadyAutoCollectedFlag] = true;

                        // If there is no context create one, this apply when no request is triggering the dependency
                        if (!CorrelationContextManager.getCurrentContext()) {
                            // Create correlation context and wrap execution
                            let operationId = null;
                            if (CorrelationIdManager.w3cEnabled) {
                                let traceparent = new Traceparent();
                                operationId = traceparent.traceId;
                            }
                            else {
                                let requestId = CorrelationIdManager.generateRequestId(null);
                                operationId = CorrelationIdManager.getRootId(requestId);
                            }
                            let correlationContext = CorrelationContextManager.generateContextObject(operationId);
                            CorrelationContextManager.runWithContext(correlationContext, () => {
                                AutoCollectHttpDependencies.trackRequest(this._client, { options: options, request: request });
                            });
                        }
                        else {
                            AutoCollectHttpDependencies.trackRequest(this._client, { options: options, request: request });
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
        http.request = (options, ...requestArgs: any[]) => {
            const request: http.ClientRequest = originalRequest.call(http, options, ...requestArgs);
            clientRequestPatch(request, options);
            return request;
        };

        https.request = (options, ...requestArgs: any[]) => {
            const request: http.ClientRequest = originalHttpsRequest.call(https, options, ...requestArgs);
            clientRequestPatch(request, options);
            return request;
        };

        // Node 8 calls http.request from http.get using a local reference!
        // We have to patch .get manually in this case and can't just assume request is enough
        // We have to replace the entire method in this case. We can't call the original.
        // This is because calling the original will give us no chance to set headers as it internally does .end().
        http.get = (options, ...requestArgs: any[]) => {
            const request: http.ClientRequest = http.request.call(http, options, ...requestArgs);
            request.end();
            return request;
        };
        https.get = (options, ...requestArgs: any[]) => {
            const request: http.ClientRequest = https.request.call(https, options, ...requestArgs);
            request.end();
            return request;
        };
    }

    /**
     * Tracks an outgoing request. Because it may set headers this method must be called before
     * writing content to or ending the request.
     */
    public static trackRequest(client: TelemetryClient, telemetry: Contracts.NodeHttpDependencyTelemetry) {
        if (!telemetry.options || !telemetry.request || !client) {
            Logging.info("AutoCollectHttpDependencies.trackRequest was called with invalid parameters: ", !telemetry.options, !telemetry.request, !client);
            return;
        }

        let requestParser = new HttpDependencyParser(telemetry.options, telemetry.request);

        const currentContext = CorrelationContextManager.getCurrentContext();
        let uniqueRequestId: string;
        let uniqueTraceparent: string;
        if (currentContext && currentContext.operation && currentContext.operation.traceparent && Traceparent.isValidTraceId(currentContext.operation.traceparent.traceId)) {
            currentContext.operation.traceparent.updateSpanId();
            uniqueRequestId = currentContext.operation.traceparent.getBackCompatRequestId();
        } else if (CorrelationIdManager.w3cEnabled) {
            // Start an operation now so that we can include the w3c headers in the outgoing request
            const traceparent = new Traceparent();
            uniqueTraceparent = traceparent.toString();
            uniqueRequestId = traceparent.getBackCompatRequestId();
        } else {
            uniqueRequestId = currentContext && currentContext.operation && (currentContext.operation.parentId + AutoCollectHttpDependencies.requestNumber++ + ".");
        }

        // Add the source correlationId to the request headers, if a value was not already provided.
        // The getHeader/setHeader methods aren't available on very old Node versions, and
        // are not included in the v0.10 type declarations currently used. So check if the
        // methods exist before invoking them.
        if (Util.canIncludeCorrelationHeader(client, requestParser.getUrl()) && telemetry.request.getHeader && telemetry.request.setHeader) {
            if (client.config && client.config.correlationId) {
                // getHeader returns "any" type in newer versions of node. In basic scenarios, this will be <string | string[] | number>, but could be modified to anything else via middleware
                const correlationHeader = <any>telemetry.request.getHeader(RequestResponseHeaders.requestContextHeader)
                try {
                    Util.safeIncludeCorrelationHeader(client, telemetry.request, correlationHeader);
                } catch (err) {
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
                        } else if (CorrelationIdManager.w3cEnabled) {
                            // should never get here since we set uniqueTraceparent above for the w3cEnabled scenario
                            const traceparent = new Traceparent().toString();
                            telemetry.request.setHeader(RequestResponseHeaders.traceparentHeader, traceparent);
                        }
                        if (currentContext.operation.tracestate) {
                            const tracestate = currentContext.operation.tracestate.toString();
                            if (tracestate) {
                                telemetry.request.setHeader(RequestResponseHeaders.traceStateHeader, tracestate);
                            }
                        }

                        const correlationContextHeader = (<PrivateCustomProperties>currentContext.customProperties).serializeToHeader();
                        if (correlationContextHeader) {
                            telemetry.request.setHeader(RequestResponseHeaders.correlationContextHeader, correlationContextHeader);
                        }
                    } catch (err) {
                        Logging.warn("Correlation headers could not be set. Correlation of requests may be lost.", err);
                    }
                }
            }
        }

        // Collect dependency telemetry about the request when it finishes.
        if (telemetry.request.on) {
            telemetry.request.on("response", (response: http.ClientResponse) => {
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
            telemetry.request.on("error", (error: Error) => {
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
            telemetry.request.on("abort", () => {
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
    }

    public dispose() {
        AutoCollectHttpDependencies.INSTANCE = null;
        this.enable(false);
        this._isInitialized = false;
    }
}

export = AutoCollectHttpDependencies;
