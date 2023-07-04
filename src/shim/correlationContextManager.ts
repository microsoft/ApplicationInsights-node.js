import * as events from "events";
import * as http from "http";
import { context, SpanContext, createContextKey, trace, Attributes } from "@opentelemetry/api";
import { Span } from "@opentelemetry/sdk-trace-base";
import { ICorrelationContext, ITraceparent, ITracestate, HttpRequest } from "./types";
import { Logger } from "../shared/logging";
import Traceparent = require("./util/Traceparent");
import Tracestate = require("./util/Tracestate");
import * as azureFunctionsTypes from "@azure/functions";

export class CorrelationContextManager {

    public static spanToContextObject(spanContext: SpanContext, parentId?: string, name?: string, customProperties?: Attributes, traceState?: string): ICorrelationContext {
        const traceContext = new Traceparent();
        const tracestate = new Tracestate(traceState);
        traceContext.traceId = spanContext.traceId;
        traceContext.spanId = spanContext.spanId;
        traceContext.traceFlag = Traceparent.formatOpenTelemetryTraceFlags(spanContext.traceFlags) || Traceparent.DEFAULT_TRACE_FLAG;
        traceContext.parentId = parentId;

        let serializedAttributes: string;
        try {
            serializedAttributes = JSON.stringify(customProperties);
        } catch (error) {
            Logger.getInstance().warn("Could not serialize customProperties. Dropping custom properties.");
        }
        return this.generateContextObject(traceContext.traceId, traceContext.parentId, name, serializedAttributes, traceContext, tracestate);
    }

    /**
     *  Provides the current Context.
     *  The context is the most recent one entered into for the current
     *  logical chain of execution, including across asynchronous calls.
     */
    public static getCurrentContext(): ICorrelationContext {
        // Gets the active span and extracts the context to populate and return the ICorrelationContext object
        const activeSpan: Span = trace.getSpan(context.active()) as Span;

        return this.spanToContextObject(activeSpan.spanContext(), activeSpan.parentSpanId, activeSpan.name, activeSpan.attributes, activeSpan.spanContext()?.traceState?.serialize());
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
            // Pass Span attributes as custom properties
            customProperties: new CustomPropertiesImpl(correlationContextHeader),
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

        // OpenTelemetry Span
        if (span) {
            return this.spanToContextObject(span.spanContext(), span.parentSpanId, span.name);
        }

        // OpenTelemetry SpanContext
        if (spanContext) {
            return this.spanToContextObject(spanContext, `|${spanContext.traceId}.${spanContext.spanId}.`, typeof request === "string" ? request : "");
        }

        let operationName = typeof request === "string" ? request : "";
        
        // AzFunction TraceContext
        if (traceContext) {
            let traceparent = null;
            let tracestate = null;
            operationName = traceContext.attributes["OperationName"] || operationName;
            if (request) {
                const azureFnRequest = request as azureFunctionsTypes.HttpRequest;
                if (azureFnRequest.headers) {
                    if (azureFnRequest.headers.traceparent) {
                        traceparent = new Traceparent(azureFnRequest.headers.traceparent);
                    } else if (azureFnRequest.headers["request-id"]) {
                        traceparent = new Traceparent(null);
                    }
                    if (azureFnRequest.headers.tracestate) {
                        tracestate = new Tracestate(azureFnRequest.headers.tracestate);
                    }
                }
            }
            if (!traceparent) {
                traceparent = new Traceparent(traceContext.traceparent);
            }
            if (!tracestate) {
                tracestate = new Tracestate(traceContext.tracestate);
            }

            // TODO: Add support for operationName
            let correlationContextHeader = undefined;
            if (typeof request === "object") {
                correlationContextHeader = request.headers["correlation-context"] ? request.headers["correlation-context"].toString() : null;
                // operationName = parser.getOperationName({});
            }
            const correlationContext = CorrelationContextManager.generateContextObject(
                traceparent.traceId,
                traceparent.parentId,
                operationName,
                correlationContextHeader,
                traceparent,
                tracestate
            );

            return correlationContext;
        }

        // TOOD: Add support for operationName
        // No TraceContext available, parse as http.IncomingMessage
        if (headers) {
            const traceparent = new Traceparent(headers.traceparent ? headers.traceparent.toString() : null);
            // const tracestate = new Tracestate(headers.tracestate ? headers.tracestate.toString() : null);
            // const parser = new HttpRequestParser(input as http.IncomingMessage | azureFunctionsTypes.HttpRequest);
            const correlationContext = CorrelationContextManager.generateContextObject(
                traceparent.traceId,
                traceparent.parentId,
                // parser.getOperationName({}),
                headers["correlation-context"] ? headers["correlation-context"].toString() : null,
                // traceparent,
                // tracestate
            );

            return correlationContext;
        }

        Logger.getInstance().warn("startOperation was called with invalid arguments");
        return null;
    }

    /**
     *  Disables the CorrelationContextManager.
     */
    public static disable() {
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

export interface CustomProperties {
    /**
     * Get a custom property from the correlation context
     */
    getProperty(key: string): string;
    /**
     * Store a custom property in the correlation context.
     * Do not store sensitive information here.
     * Properties stored here are exposed via outgoing HTTP headers for correlating data cross-component.
     * The characters ',' and '=' are disallowed within keys or values.
     */
    setProperty(key: string, value: string): void;
}

export interface PrivateCustomProperties extends CustomProperties {
    addHeaderData(header: string): void;
    serializeToHeader(): string;
}

class CustomPropertiesImpl implements PrivateCustomProperties {
    private static bannedCharacters = /[,=]/;
    private props: { key: string, value: string }[] = [];

    public constructor(header: string) {
        this.addHeaderData(header);
    }

    public addHeaderData(header?: string) {
        const keyvals = header ? header.split(", ") : [];
        this.props = keyvals.map((keyval) => {
            const parts = keyval.split("=");
            return { key: parts[0], value: parts[1] };
        }).concat(this.props);
    }

    public serializeToHeader() {
        return this.props.map((keyval) => `${keyval.key}=${keyval.value}`).join(", ");
    }

    public getProperty(prop: string) {
        for (let i = 0; i < this.props.length; ++i) {
            const keyval = this.props[i]
            if (keyval.key === prop) {
                return keyval.value;
            }
        }
        return;
    }

    // TODO: Strictly according to the spec, properties which are recieved from
    // an incoming request should be left untouched, while we may add our own new
    // properties. The logic here will need to change to track that.
    public setProperty(prop: string, val: string) {
        if (CustomPropertiesImpl.bannedCharacters.test(prop) || CustomPropertiesImpl.bannedCharacters.test(val)) {
            Logger.getInstance().warn(`Correlation context property keys and values must not contain ',' or '='. setProperty was called with key: ${ prop } and value: ${ val}`);
            return;
        }
        for (let i = 0; i < this.props.length; ++i) {
            const keyval = this.props[i];
            if (keyval.key === prop) {
                keyval.value = val;
                return;
            }
        }
        this.props.push({ key: prop, value: val });
    }
}
