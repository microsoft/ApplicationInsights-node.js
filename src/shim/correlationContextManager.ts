import * as events from "events";
import * as http from "http";
import { context, SpanContext, createContextKey, trace, TraceState, propagation, Context } from "@opentelemetry/api";
import { Span } from "@opentelemetry/sdk-trace-base";
import { ICorrelationContext, ITraceparent, ITracestate, HttpRequest, ICustomProperties } from "./types";
import { Logger } from "../shared/logging";
import * as azureFunctionsTypes from "@azure/functions";

export class CorrelationContextManager {

    public static spanToContextObject(spanContext: SpanContext, parentId?: string, name?: string, traceState?: TraceState): ICorrelationContext {
        // Generate a basic ITraceparent to satisfy the ICorrelationContext interface
        const traceContext: ITraceparent = {
            legacyRootId: "",
            traceId: spanContext.traceId,
            spanId: spanContext.spanId,
            traceFlag: spanContext.traceFlags.toString(),
            parentId: parentId || spanContext.traceId,
            version: "00"
        };

        return this.generateContextObject(traceContext.traceId, traceContext.parentId, name, traceContext, traceState);
    }

    /**
     *  Provides the current Context.
     *  The context is the most recent one entered into for the current
     *  logical chain of execution, including across asynchronous calls.
     */
    public static getCurrentContext(): ICorrelationContext {
        // Gets the active span and extracts the context to populate and return the ICorrelationContext object
        const activeSpan: Span = trace.getSpan(context.active()) as Span;

        return this.spanToContextObject(activeSpan.spanContext(), activeSpan.parentSpanId, activeSpan.name, activeSpan.spanContext()?.traceState);
    }

    /**
     *  A helper to generate objects conforming to the CorrelationContext interface
     */
    public static generateContextObject(
        operationId: string,
        parentId?: string,
        operationName?: string,
        traceparent?: ITraceparent,
        tracestate?: TraceState
    ): ICorrelationContext {
        parentId = parentId || operationId;

        // Cast OpenTelemetry TraceState object to ITracestate object
        const ITraceState: ITracestate = {
            fieldmap: tracestate?.serialize()?.split(",")
        };
        
        return {
            operation: {
                name: operationName,
                id: operationId,
                parentId: parentId,
                traceparent: traceparent,
                tracestate: ITraceState,
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
     * Enables the CorrelationContextManager.
     * Ignore unused parameter forceClsHooked as it is only used to satisfy backward compatibility 
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

        // OpenTelemetry Span or SpanContext
        if (span || spanContext) {
            const activeContext: Context = propagation.extract(context.active(), span || spanContext);
            const activeSpan: Span = trace.getSpan(activeContext) as Span;

            return this.spanToContextObject(activeSpan.spanContext(), activeSpan.parentSpanId, activeSpan.name, activeSpan.spanContext()?.traceState);
        }

        // AzFunction TraceContext
        if (traceContext) {
            // Use the headers on the request from Az Fns to extract context and then set that as the active context
                const azureFnRequest = request as azureFunctionsTypes.HttpRequest;

                // If the traceparent isn't defined on the headers set it to the request-id
                if (!azureFnRequest.headers.traceparent) {
                    azureFnRequest.headers.traceparent = azureFnRequest.headers["request-id"];
                }

                // If the request was passed to the function - extract the context from the headers, if not use the traceContext
                const activeContext = propagation.extract(context.active(), azureFnRequest?.headers || traceContext);

                const activeSpan: Span = trace.getSpan(activeContext) as Span;
                return this.spanToContextObject(activeSpan.spanContext(), activeSpan.parentSpanId, activeSpan.name, activeSpan.spanContext()?.traceState);
        }

        // If no TraceContext is available, extract context from the headers object
        if (headers) {
                const activeContext = propagation.extract(context.active(), headers);

                const activeSpan: Span = trace.getSpan(activeContext) as Span;
                return this.spanToContextObject(activeSpan.spanContext(), activeSpan.parentSpanId, activeSpan.name, activeSpan.spanContext()?.traceState);
        }
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
