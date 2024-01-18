// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as events from "events";
import * as http from "http";
import * as azureFunctionsTypes from "@azure/functions";
import { context, SpanContext, trace, Context, diag } from "@opentelemetry/api";
import { TraceState } from "@opentelemetry/core";
import { Span } from "@opentelemetry/sdk-trace-base";
import { ICorrelationContext, ITraceparent, ITracestate, HttpRequest, ICustomProperties } from "./types";
import { Util } from "../shared/util";


const CONTEXT_NAME = "ApplicationInsights-Context";

export class CorrelationContextManager {
    // Context is taken from the trace API and not context API so we need a flag to disable this functionality
    private static _isDisabled = false;

    /**
     * Converts an OpenTelemetry SpanContext object to an ICorrelationContext object for backwards compatibility with ApplicationInsights
     * @param spanContext OpenTelmetry SpanContext object
     * @param parentId spanId of the parent span
     * @param name OpenTelemetry human readable name of the span
     * @param traceState String of key value pairs for additional trace context
     * @returns ICorrelationContext object
     */
    public static spanToContextObject(spanContext: SpanContext, parentId?: string, name?: string, traceState?: TraceState): ICorrelationContext {
        // Generate a basic ITraceparent to satisfy the ICorrelationContext interface
        const traceContext: ITraceparent = {
            legacyRootId: "",
            traceId: spanContext?.traceId,
            spanId: spanContext?.spanId,
            traceFlag: spanContext?.traceFlags?.toString(),
            parentId: parentId,
            version: "00"
        };

        return this.generateContextObject(traceContext.traceId, traceContext.parentId, name, traceContext, traceState);
    }

    /**
     * Provides the current Context.
     * The context is the most recent one entered into for the current
     * logical chain of execution, including across asynchronous calls.
     * @returns ICorrelationContext object
     */
    public static getCurrentContext(): ICorrelationContext | null {
        if (!this._isDisabled) {
            // Gets the active span and extracts the context to populate and return the ICorrelationContext object
            let activeSpan: Span = trace.getSpan(context.active()) as Span;

            // If no active span exists, create a new one. This is needed if runWithContext() is executed without an active span
            if (!activeSpan) { 
                activeSpan = trace.getTracer(CONTEXT_NAME).startSpan(CONTEXT_NAME) as Span;
            }
            const traceStateObj: TraceState = new TraceState(activeSpan?.spanContext()?.traceState?.serialize());

            return this.spanToContextObject(activeSpan?.spanContext(), activeSpan?.parentSpanId, activeSpan?.name, traceStateObj);
        } 
        return null;
    }

    /**
     * Helper to generate objects conforming to the CorrelationContext interface
     * @param operationId String assigned to a series of related telemetry items - equivalent to OpenTelemetry traceId
     * @param parentId spanId of the parent span
     * @param operationName Human readable name of the span
     * @param traceparent Context conveying string in the format version-traceId-spanId-traceFlag
     * @param tracestate String of key value pairs for additional trace context
     * @returns ICorrelationContext object
     */
    public static generateContextObject(
        operationId: string,
        parentId?: string,
        operationName?: string,
        traceparent?: ITraceparent,
        tracestate?: TraceState
    ): ICorrelationContext {
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
            customProperties: {
                getProperty(prop: string) { return "" },
                setProperty(prop: string) { return "" },
            } as ICustomProperties,
        }
    }

    /**
     * Runs a function inside a given Context.
     * All logical children of the execution path that entered this Context
     * will receive this Context object on calls to GetCurrentContext.
     * @param ctx Context to run the function within
     * @param fn Function to run within the stated context
     * @returns any
     */
    public static runWithContext(ctx: ICorrelationContext, fn: () => any): any {
        // Creates a new Context object containing the values from the ICorrelationContext object, then sets the active context to the new Context
        try {
            const newContext: Context = trace.setSpanContext(context.active(), this._contextObjectToSpanContext(ctx));
            return context.with(newContext, fn);
        } catch (error) {
            diag.warn("Error binding to session context", Util.getInstance().dumpObj(error));
        }
        return fn();
    }

    /**
     * Wrapper for cls-hooked bindEmitter method
     * @param emitter emitter to bind to the current context
     */
    public static wrapEmitter(emitter: events.EventEmitter): void {
        try {
            context.bind(context.active(), emitter);
        } catch (error) {
            diag.warn("Error binding to session context", Util.getInstance().dumpObj(error));
        }
    }
    
    /**
     * Patches a callback to restore the correct Context when getCurrentContext
     * is run within it. This is necessary if automatic correlation fails to work
     * with user-included libraries.
     * The supplied callback will be given the same context that was present for
     * the call to wrapCallback
     * @param fn Function to be wrapped in the provided context
     * @param ctx Context to bind the function to
     * @returns Generic type T
     */
    public static wrapCallback<T>(fn: T, ctx?: ICorrelationContext): T {
        try {
            if (ctx) {
                // Create the new context and bind it if context is passed
                const newContext: Context = trace.setSpanContext(context.active(), this._contextObjectToSpanContext(ctx));
                return context.bind(newContext, fn);
            }
            // If no context is passed, bind to the current context
            return context.bind(context.active(), fn);
        } catch (error) {
            diag.error("Error binding to session context", Util.getInstance().dumpObj(error));
            return fn;
        }
    }

    /**
     * Enables the CorrelationContextManager
     * @param forceClsHooked unused parameter used to satisfy backward compatibility
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public static enable(forceClsHooked?: boolean) {
        diag.info("Enabling the context manager is no longer necessary and this method is a no-op.");
    }

    /**
     * Creates a new correlation context
     * @param input Any kind of object we can extract context information from
     * @param request HTTP request we can pull context information from in the form of the request's headers
     * @returns IcorrelationContext object
     */
    public static startOperation(
        input: azureFunctionsTypes.Context | (http.IncomingMessage | azureFunctionsTypes.HttpRequest) | SpanContext | Span,
        request?: HttpRequest | string
    ): ICorrelationContext {
        const traceContext = input && (input as azureFunctionsTypes.Context).traceContext || null;
        const span = input && (input as Span).spanContext ? input as Span : null;
        const spanContext = input && (input as SpanContext).traceId ? input as SpanContext : null;
        const headers = input && (input as http.IncomingMessage | azureFunctionsTypes.HttpRequest).headers;

        if (span) {
            trace.setSpanContext(context.active(), span.spanContext());
            return this.spanToContextObject(
                span.spanContext(),
                span.parentSpanId,
            );
        }

        if (spanContext) {
            trace.setSpanContext(context.active(), spanContext);
            return this.spanToContextObject(
                spanContext,
            );
        }

        if (traceContext || headers) {
            let traceparent = null;
            let tracestate = null;
            if (traceContext) {
                // Use the headers on the request from Azure Functions to set the active context
                const azureFnRequest = request as azureFunctionsTypes.HttpRequest;

                // If the traceparent isn't defined on the azure function headers set it to the request-id
                if (azureFnRequest?.headers) {
                    // request-id is a GUID-based unique identifier for the request
                    traceparent = azureFnRequest.headers.traceparent ? azureFnRequest.headers.traceparent : azureFnRequest.headers["request-id"];
                    tracestate = azureFnRequest.headers.tracestate;
                }

                if (!traceparent) {
                    traceparent = traceContext.traceparent;
                }
                if (!tracestate) {
                    tracestate = traceContext.tracestate;
                }
            }

            // If headers is defined instead of traceContext, use the headers to set the traceparent and tracestate
            if (headers) {
                traceparent = headers.traceparent ? headers.traceparent.toString() : null;
                tracestate = headers.tracestate ? headers.tracestate.toString() : tracestate;
            }

            const traceArray: string[] = traceparent?.split("-");

            const tracestateObj: TraceState = new TraceState();
            tracestate?.split(",").forEach((pair) => {
                const kv = pair.split("=");
                tracestateObj.set(kv[0], kv[1]);
            });

            return this.generateContextObject(
                traceArray[1],
                traceArray[2],
                null,
                {
                    legacyRootId: "",
                    parentId: "",
                    spanId: traceArray[2],
                    traceFlag: "",
                    traceId: traceArray[1],
                    version: "00",
                },
                tracestateObj
            );
        }
        diag.warn("startOperation was called with invalid arguments");
        return null;
    }

    /**
     * Disables the CorrelationContextManager
     */
    public static disable() {
        diag.warn("It will not be possible to re-enable the current context manager after disabling it!");
        this._isDisabled = true;
        context.disable();
    }

    /**
     * Resets the namespace
     */
    public static reset() {
        diag.info("This is a no-op and exists only for compatibility reasons.");
    }

    /**
     * Converts ApplicationInsights' ICorrelationContext to an OpenTelemetry SpanContext
     * @param ctx ICorrelationContext object to convert to a SpanContext
     * @returns OpenTelemetry SpanContext
     */
    private static _contextObjectToSpanContext(ctx: ICorrelationContext): SpanContext {
        return {
            traceId: ctx.operation.id,
            spanId: ctx.operation.traceparent?.spanId ?? "",
            traceFlags: ctx.operation.traceparent?.traceFlag ? Number(ctx.operation.traceparent?.traceFlag) : undefined,
        };
    }
}
