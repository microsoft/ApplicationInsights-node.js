// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import type * as http from 'http';
import * as url from 'url';
import { Context, HttpRequest, HttpResponse } from "@azure/functions";
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
        // TODO: Remove
        ctx.log('Overriden function:' + JSON.stringify(ctx.traceContext));

        // Update context to use Azure Functions one
        let extractedContext = null;
        if (ctx.traceContext) {
            extractedContext = propagation.extract(ROOT_CONTEXT, ctx.traceContext);
        }

        const currentContext = extractedContext || context.active();
        context.with(currentContext, async () => {
            ctx.log('SPAN START:');
            const incomingRequestSpan = this._generateServerSpan(request);
            originalCallback(ctx, request);
            if (incomingRequestSpan) {
                incomingRequestSpan.setAttribute(SemanticAttributes.HTTP_STATUS_CODE, ctx.res.statusCode);
                incomingRequestSpan.end();
                await this._traceHandler.flush();
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

        // if there is no port in host and there is a port
        // it should be displayed if it's not 80 and 443 (default ports)
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
