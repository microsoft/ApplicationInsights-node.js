import * as events from "events";
import * as http from "http";
import { context, SpanContext, createContextKey, trace } from "@opentelemetry/api";
import { Span } from "@opentelemetry/sdk-trace-base";
import { ICorrelationContext, ITraceparent, ITracestate, HttpRequest, ICustomProperties } from "./types";
import { Logger } from "../shared/logging";
import Tracestate = require("./util/Tracestate");
import * as azureFunctionsTypes from "@azure/functions";
import url = require("url");

export class CorrelationContextManager {

    public static spanToContextObject(spanContext: SpanContext, parentId?: string, name?: string, traceState?: string): ICorrelationContext {
        const traceContext: ITraceparent = {
            legacyRootId: "",
            traceId: spanContext.traceId,
            spanId: spanContext.spanId,
            traceFlag: spanContext.traceFlags.toString(),
            parentId: parentId,
            version: "00"
        };
        const tracestate = new Tracestate(traceState);

        return this.generateContextObject(traceContext.traceId, traceContext.parentId, name, null, traceContext, tracestate);
    }

    /**
     *  Provides the current Context.
     *  The context is the most recent one entered into for the current
     *  logical chain of execution, including across asynchronous calls.
     */
    public static getCurrentContext(): ICorrelationContext {
        // Gets the active span and extracts the context to populate and return the ICorrelationContext object
        const activeSpan: Span = trace.getSpan(context.active()) as Span;

        return this.spanToContextObject(activeSpan.spanContext(), activeSpan.parentSpanId, activeSpan.name, activeSpan.spanContext()?.traceState?.serialize());
    }

    /**
     *  A helper to generate objects conforming to the CorrelationContext interface
     */
    public static generateContextObject(
        operationId: string,
        parentId?: string,
        operationName?: string,
        correlationContextHeader?: string,
        traceparent?: ITraceparent,
        tracestate?: ITracestate
    ): ICorrelationContext {
        parentId = parentId || operationId;
        return {
            operation: {
                name: operationName,
                id: operationId,
                parentId: parentId,
                traceparent: traceparent,
                tracestate: tracestate,
            },
            // Headers are not being used so custom properties will always be stubbed out
            customProperties: {} as ICustomProperties,
        }
    }

    /**
     *  Runs a function inside a given Context.
     *  All logical children of the execution path that entered this Context
     *  will receive this Context object on calls to GetCurrentContext.
     */
    public static runWithContext(ctx: ICorrelationContext, fn: () => any): any {
        // Creates a new SpanContext containing the values from the ICorrelationContext object, then sets the active context to the new span context
        const contextName = createContextKey(ctx.operation.name);
        const spanContext = this._contextObjectToSpanContext(ctx);

        return context.with(context.active().setValue(contextName, spanContext), fn);
    }

    /**
     * Wrapper for cls-hooked bindEmitter method
     */
    public static wrapEmitter(emitter: events.EventEmitter): void {
        context.bind(context.active(), emitter);
    }
    
    /**
     *  Patches a callback to restore the correct Context when getCurrentContext
     *  is run within it. This is necessary if automatic correlation fails to work
     *  with user-included libraries.
     *
     *  The supplied callback will be given the same context that was present for
     *  the call to wrapCallback.  */
    public static wrapCallback<T>(fn: T, ctx?: ICorrelationContext): T {
        const contextName = createContextKey(ctx.operation.name);
        const spanContext = this._contextObjectToSpanContext(ctx);
        return context.bind(context.active().setValue(contextName, spanContext), fn);
    }

    /**
     *  Enables the CorrelationContextManager.
     */
    public static enable(forceClsHooked?: boolean) {
        Logger.getInstance().info("Enabling the context manager is no longer necessary and this method is a no-op.");
    }

    /**
     * Create new correlation context.
     */
    public static startOperation(
        input: azureFunctionsTypes.Context | (http.IncomingMessage | azureFunctionsTypes.HttpRequest) | SpanContext | Span,
        request?: HttpRequest | string
    ): ICorrelationContext | null {
        const traceContext = input && (input as azureFunctionsTypes.Context).traceContext || null;
        const span = input && (input as Span).spanContext ? input as Span : null;
        const spanContext = input && (input as SpanContext).traceId ? input as SpanContext : null;
        const headers = input && (input as http.IncomingMessage | azureFunctionsTypes.HttpRequest).headers;

        // TODO: THIS ALL NEEDS REDONE

        return null;
    }

    /**
     * Helper to get an absolute url from request object
     */
    private static _getAbsoluteUrl(request: http.IncomingMessage | HttpRequest): string {
        if (!request.headers) {
            return request.url;
        }

        const encrypted = (<any>request).connection ? ((<any>request).connection as any).encrypted : null;

        const protocol = (encrypted || request.headers["x-forwarded-proto"] === "https") ? "https" : "http";

        const baseUrl = `${protocol}://${request.headers.host}/`;

        let pathName = "";
        let search = "";
        try {
            const requestUrl = new url.URL(request.url, baseUrl);
            pathName = requestUrl.pathname;
            search = requestUrl.search;
        }
        catch (ex) {
            // Ignore errors
        }
        return url.format({
            protocol: protocol,
            host: request.headers.host,
            pathname: pathName,
            search: search
        });
    }

    /**
     *  Disables the CorrelationContextManager.
     */
    public static disable() {
        Logger.getInstance().warn("It will not be possible to re-enable the current context manager after disabling it!");
        context.disable();
    }

    /**
     * Reset the namespace
     */
    public static reset() {
        Logger.getInstance().info("This is a no-op and exists only for compatibility reasons.");
    }

    private static _contextObjectToSpanContext(ctx: ICorrelationContext): SpanContext {
        return {
            traceId: ctx.operation.id,
            spanId: ctx.operation.traceparent.spanId,
            traceFlags: parseInt(ctx.operation.traceparent.traceFlag, 10),
        };
    }
}
