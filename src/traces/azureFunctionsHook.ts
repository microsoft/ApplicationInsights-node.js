// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import type * as http from 'http';
import * as url from 'url';
import { Context, HttpRequest } from "@azure/functions";
import { Attributes, Span, SpanKind, SpanOptions, context, propagation, ROOT_CONTEXT } from "@opentelemetry/api";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import { ApplicationInsightsConfig } from "../shared";
import { Logger } from "../shared/logging"
import { TraceHandler } from "./traceHandler";


export class AzureFunctionsHook {
    private _traceHandler: TraceHandler;
    private _config: ApplicationInsightsConfig;
    private _functionsCoreModule: any;
    private _preInvocationHook: any;

    constructor(traceHandler: TraceHandler, config: ApplicationInsightsConfig) {
        this._traceHandler = traceHandler;
        this._config = config;
        try {
            this._functionsCoreModule = require("@azure/functions-core");
        }
        catch (error) {
            Logger.getInstance().debug("@azure/functions-core failed to load, not running in Azure Functions");
            return;
        }
        this._addPreInvocationHook();
    }

    public shutdown() {
        if (this._preInvocationHook) {
            this._preInvocationHook.dispose();
            this._preInvocationHook = undefined;
        }
        this._functionsCoreModule = undefined;
    }

    private _addPreInvocationHook() {
        if (!this._preInvocationHook) {
            this._preInvocationHook = this._functionsCoreModule.registerHook('preInvocation', async (preInvocationContext: any) => {
                const originalCallback = preInvocationContext.functionCallback;
                preInvocationContext.functionCallback = async (ctx: Context, request: HttpRequest) => {
                    this._propagateContext(ctx, request, originalCallback);
                };
            });
        }
    }

    private async _propagateContext(ctx: Context, request: HttpRequest, originalCallback: any) {
        // Update context to use Azure Functions one
        let extractedContext = null;
        try {
            if (ctx.traceContext) {
                extractedContext = propagation.extract(ROOT_CONTEXT, ctx.traceContext);
            }
        }
        catch (err) {
            Logger.getInstance().error("Failed to propagate context in Azure Functions", err);
        }
        const currentContext = extractedContext || context.active();
        context.with(currentContext, async () => {
            const incomingRequestSpan = this._generateServerSpan(request);
            originalCallback(ctx, request);
            try {
                if (incomingRequestSpan) {
                    let statusCode = 200; //Default
                    if (ctx.res) {
                        if (ctx.res.statusCode) {
                            statusCode = ctx.res.statusCode;
                        }
                        else if (ctx.res.status) {
                            statusCode = ctx.res.status;
                        }
                    }
                    incomingRequestSpan.setAttribute(SemanticAttributes.HTTP_STATUS_CODE, statusCode);
                    incomingRequestSpan.end();
                    await this._traceHandler.flush();
                }
            }
            catch (err) {
                Logger.getInstance().error("Error creating automatic server span in Azure Functions", err);
            }
        });
    }

    private _generateServerSpan(request: HttpRequest): Span {
        let incomingRequestSpan: Span = null;
        // Create server Span if configured on
        if (this._config.enableAutoCollectAzureFunctions) {
            const spanAttributes = this._getSpanAttributes(request);
            const spanOptions: SpanOptions = {
                kind: SpanKind.SERVER,
                attributes: spanAttributes,
            };
            const method = request.method || 'GET';
            incomingRequestSpan = this._traceHandler.getTracer().startSpan(`HTTPS ${method}`, spanOptions);
        }
        return incomingRequestSpan;
    }

    /**
     * Returns incoming request attributes scoped to the request data
     * @param {HttpRequest} request the request object
     */
    private _getSpanAttributes = (
        request: HttpRequest
    ): Attributes => {
        const headers = request.headers;
        const userAgent = headers['user-agent'];
        const ips = headers['x-forwarded-for'];
        const method = request.method || 'GET';
        const requestUrl = request.url ? url.parse(request.url) : null;
        const host = requestUrl?.host || headers.host;
        const hostname =
            requestUrl?.hostname ||
            host?.replace(/^(.*)(:[0-9]{1,5})/, '$1') ||
            'localhost';
        const attributes: Attributes = {
            [SemanticAttributes.HTTP_URL]: this._getAbsoluteUrl(
                requestUrl,
                headers,
            ),
            [SemanticAttributes.HTTP_HOST]: host,
            [SemanticAttributes.NET_HOST_NAME]: hostname,
            [SemanticAttributes.HTTP_METHOD]: method,
        };
        if (typeof ips === 'string') {
            attributes[SemanticAttributes.HTTP_CLIENT_IP] = ips.split(',')[0];
        }
        if (requestUrl) {
            attributes[SemanticAttributes.HTTP_TARGET] = requestUrl.pathname || '/';
        }
        if (userAgent !== undefined) {
            attributes[SemanticAttributes.HTTP_USER_AGENT] = userAgent;
        }
        return attributes;
    };


    private _getAbsoluteUrl = (
        requestUrl: (http.RequestOptions & Partial<url.UrlWithParsedQuery>)
            | http.RequestOptions | null,
        headers: http.IncomingHttpHeaders,
        fallbackProtocol = 'http:'
    ): string => {
        const reqUrlObject = requestUrl || {};
        const protocol = reqUrlObject.protocol || fallbackProtocol;
        const port = (reqUrlObject.port || '').toString();
        const path = reqUrlObject.path || '/';
        let host =
            reqUrlObject.host || reqUrlObject.hostname || headers.host || 'localhost';
        if (
            (host as string).indexOf(':') === -1 &&
            port &&
            port !== '80' &&
            port !== '443'
        ) {
            host += `:${port}`;
        }
        return `${protocol}//${host}${path}`;
    };
}
