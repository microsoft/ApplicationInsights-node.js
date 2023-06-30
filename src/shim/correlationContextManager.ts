import * as events from "events";
import * as http from "http";
import { context, Context, SpanContext, createContextKey, trace, Attributes } from "@opentelemetry/api";
import { Span } from "@opentelemetry/sdk-trace-base";
import { ICorrelationContext, ITraceparent, ITracestate, HttpRequest } from "./types";
import { Logger } from "../shared/logging";
import Traceparent = require("./util/Traceparent");
import Tracestate = require("./util/Tracestate");

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
        const spanContext: SpanContext = {
            traceId: ctx.operation.id,
            spanId: ctx.operation.traceparent.spanId,
            traceFlags: parseInt(ctx.operation.traceparent.traceFlag, 10),
        };

        return context.with(context.active().setValue(contextName, spanContext), fn);
    }

    /**
     * Wrapper for cls-hooked bindEmitter method
     */
    public static wrapEmitter(emitter: events.EventEmitter): void {
        throw new Error("Not implemented");
    }

    /**
     *  Patches a callback to restore the correct Context when getCurrentContext
     *  is run within it. This is necessary if automatic correlation fails to work
     *  with user-included libraries.
     *
     *  The supplied callback will be given the same context that was present for
     *  the call to wrapCallback.  */
    public static wrapCallback<T>(fn: T, context?: ICorrelationContext): T {
        throw new Error("Not implemented");
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
        context: Context | (http.IncomingMessage | HttpRequest) | SpanContext,
        request?: HttpRequest | string
    ): ICorrelationContext | null {
        throw new Error("Not implemented");
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
        throw new Error("Not implemented");
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
