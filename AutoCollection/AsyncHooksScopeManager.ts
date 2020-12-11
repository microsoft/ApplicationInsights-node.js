import { CorrelationContextManager, CorrelationContext } from "./CorrelationContextManager"
import { ISpanContext } from "diagnostic-channel";
import { EventEmitter } from "events";

/**
 * Type of span. Can be used to specify additional relationships between spans
 * in addition to a parent/child relationship.
 */
export enum SpanKind {
    /** Default value. Indicates that the span is used internally. */
    INTERNAL = 0,

    /**
     * Indicates that the span covers server-side handling of an RPC or other
     * remote request.
     */
    SERVER = 1,

    /**
     * Indicates that the span covers the client-side wrapper around an RPC or
     * other remote request.
     */
    CLIENT = 2,

    /**
     * Indicates that the span describes producer sending a message to a
     * broker. Unlike client and server, there is no direct critical path latency
     * relationship between producer and consumer spans.
     */
    PRODUCER = 3,

    /**
     * Indicates that the span describes consumer receiving a message from a
     * broker. Unlike client and server, there is no direct critical path latency
     * relationship between producer and consumer spans.
     */
    CONSUMER = 4,
}

export interface Link {
    /** The {@link SpanContext} of a linked span. */
    spanContext: SpanContext;
    /** A set of {@link Attributes} on the link. */
    attributes?: Record<string, string>;
}

export interface SpanContext {
    traceId: string;
    spanId: string;
    traceFlags?: { toString: () => string };
    tracestate?: string;
}

export interface Span {
    _duration: [number, number]; // hrTime
    name: string;
    parentSpanId?: string;
    status: { code: number, message?: string },
    attributes: Record<string, string>,
    kind: SpanKind;
    links: Link[];
    context: () => SpanContext;
}

export class OpenTelemetryScopeManagerWrapper {
    private _activeSymbol: symbol | undefined;
    
    public active() {
        const context = CorrelationContextManager.getCurrentContext() as any;
        return {
            ...context,
            getValue: (key: symbol) => {
                // todo: lazy import activeSymbol from opentelemetry/api
                if (!this._activeSymbol) {
                    this._activeSymbol = key;
                    return context;
                }
                
                if (key === this._activeSymbol) {
                    return context;
                }
                
                return false;
            },
            setValue: () => {}
        };
    }

    public with(span: Span, fn: () => any) {
        const parentSpanId = span.parentSpanId;
        const name = span.name;
        const correlationContext = OpenTelemetryScopeManagerWrapper._spanToContext(span, parentSpanId, name);
        return CorrelationContextManager.runWithContext(correlationContext, fn)();
    }

    public bind<T>(target: T): T {
        if (typeof target === "function") {
            return CorrelationContextManager.wrapCallback(target);
        } else if (target instanceof EventEmitter) {
            CorrelationContextManager.wrapEmitter(target);
        }
        return target;
    }

    public enable(): this {
        CorrelationContextManager.enable();
        return this;
    }

    public disable(): this {
        CorrelationContextManager.disable();
        return this;
    }

    private static _spanToContext(span: Span, parentSpanId?: string, name?: string): CorrelationContext {
        const _parentId = parentSpanId ? `|${span.context().traceId}.${parentSpanId}.` : span.context().traceId;
        const context: ISpanContext = {
            ...span.context(),
            traceFlags: span.context().traceFlags.toString()
        };
        const correlationContext = CorrelationContextManager.spanToContextObject(context, _parentId, name)
        return correlationContext;
    }
}

export const AsyncScopeManager = new OpenTelemetryScopeManagerWrapper();
