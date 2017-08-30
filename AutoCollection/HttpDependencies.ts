import http = require("http");
import https = require("https");
import url = require("url");

import Client = require("../Library/Client");
import Logging = require("../Library/Logging");
import Util = require("../Library/Util");
import RequestResponseHeaders = require("../Library/RequestResponseHeaders");
import HttpDependencyParser = require("./HttpDependencyParser");
import { CorrelationContextManager, CorrelationContext, PrivateCustomProperties } from "./CorrelationContextManager";

import {enable as enableMongodb} from "./diagnostic-channel/mongodb.sub";
import {enable as enableMysql} from "./diagnostic-channel/mysql.sub";
import {enable as enableRedis} from "./diagnostic-channel/redis.sub";

import "./diagnostic-channel/initialization";

class AutoCollectHttpDependencies {
    public static disableCollectionRequestOption = 'disableAppInsightsAutoCollection';

    public static INSTANCE: AutoCollectHttpDependencies;

    private static requestNumber = 1;

    private _client: Client;
    private _isEnabled: boolean;
    private _isInitialized: boolean;

    constructor(client: Client) {
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
        enableMongodb(isEnabled, this._client);
        enableMysql(isEnabled, this._client);
        enableRedis(isEnabled, this._client);
    }

    public isInitialized() {
        return this._isInitialized;
    }

    private _initialize() {
        this._isInitialized = true;

        const originalRequest = http.request;
        http.request = (options, ...requestArgs: any[]) => {
            const request: http.ClientRequest = originalRequest.call(
                http, options, ...requestArgs);
            if (request && options && !(<any>options)[AutoCollectHttpDependencies.disableCollectionRequestOption]) {
                AutoCollectHttpDependencies.trackRequest(this._client, options, request);
            }
            return request;
        };

        // On node >= v0.11.12, https.request just calls http.request (with additional options).
        // But on older versions, https.request needs to be patched also.
        // The regex matches versions < 0.11.12 (avoiding a semver package dependency).
        if (/^0\.([0-9]\.)|(10\.)|(11\.([0-9]|10|11)$)/.test(process.versions.node)) {
            const originalHttpsRequest = https.request;
            https.request = (options, ...requestArgs: any[]) => {
                const request: http.ClientRequest = originalHttpsRequest.call(
                    https, options, ...requestArgs);
                if (request && options && !(<any>options)[AutoCollectHttpDependencies.disableCollectionRequestOption]) {
                    AutoCollectHttpDependencies.trackRequest(this._client, options, request);
                }
                return request;
            };
        }
    }

    /**
     * Tracks an outgoing request. Because it may set headers this method must be called before
     * writing content to or ending the request.
     */
    public static trackRequest(client: Client, requestOptions: string | http.RequestOptions | https.RequestOptions, request: http.ClientRequest,
        properties?: { [key: string]: string }) {
        if (!requestOptions || !request || !client) {
            Logging.info("AutoCollectHttpDependencies.trackRequest was called with invalid parameters: ", !requestOptions, !request, !client);
            return;
        }

        let requestParser = new HttpDependencyParser(requestOptions, request);

        const currentContext = CorrelationContextManager.getCurrentContext();
        const uniqueRequestId = currentContext && currentContext.operation && (currentContext.operation.parentId + AutoCollectHttpDependencies.requestNumber++ + '.');

        // Add the source correlationId to the request headers, if a value was not already provided.
        // The getHeader/setHeader methods aren't available on very old Node versions, and
        // are not included in the v0.10 type declarations currently used. So check if the
        // methods exist before invoking them.
        if (Util.canIncludeCorrelationHeader(client, requestParser.getUrl()) &&
            request['getHeader'] && request['setHeader']) {
            if (client.config && client.config.correlationId) {
                const correlationHeader = request['getHeader'](RequestResponseHeaders.requestContextHeader);
                if (correlationHeader) {
                    const components = correlationHeader.split(",");
                    const key = `${RequestResponseHeaders.requestContextSourceKey}=`;
                    if (!components.some((value) => value.substring(0,key.length) === key)) {
                        request['setHeader'](RequestResponseHeaders.requestContextHeader, `${correlationHeader},${RequestResponseHeaders.requestContextSourceKey}=${client.config.correlationId}`);
                    }
                } else {
                    request['setHeader'](RequestResponseHeaders.requestContextHeader, `${RequestResponseHeaders.requestContextSourceKey}=${client.config.correlationId}`);
                }
            }

            if (currentContext && currentContext.operation) {
                request['setHeader'](RequestResponseHeaders.requestIdHeader, uniqueRequestId);
                // Also set legacy headers
                request['setHeader'](RequestResponseHeaders.parentIdHeader, currentContext.operation.id);
                request['setHeader'](RequestResponseHeaders.rootIdHeader, uniqueRequestId);

                const correlationContextHeader = (<PrivateCustomProperties>currentContext.customProperties).serializeToHeader();
                if (correlationContextHeader) {
                    request['setHeader'](RequestResponseHeaders.correlationContextHeader, correlationContextHeader);
                }
            }
        }

        // Collect dependency telemetry about the request when it finishes.
        if (request.on) {
            request.on('response', (response: http.ClientResponse) => {
                requestParser.onResponse(response, properties);
                var context : { [name: string]: any; } = { "http.RequestOptions": requestOptions, "http.ClientRequest": request, "http.ClientResponse": response };
                var dependencyTelemetry = requestParser.getDependencyTelemetry(uniqueRequestId);
                dependencyTelemetry.contextObjects = context;
                client.trackDependency(dependencyTelemetry);
            });
            request.on('error', (e: Error) => {
                requestParser.onError(e, properties);
                var context : { [name: string]: any; } = { "http.RequestOptions": requestOptions, "http.ClientRequest": request, "Error": e };
                var dependencyTelemetry = requestParser.getDependencyTelemetry(uniqueRequestId);
                dependencyTelemetry.contextObjects = context;
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
