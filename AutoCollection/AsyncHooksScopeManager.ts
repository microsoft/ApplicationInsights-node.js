import { SpanContext } from "@opentelemetry/api";
import { Span } from "@opentelemetry/sdk-trace-base";

import { CorrelationContextManager, CorrelationContext } from "./CorrelationContextManager"
import { EventEmitter } from "events";

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
            setValue: () => { }
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
        const spanContext = span.spanContext ? span.spanContext() : (<any>span).context(); // context is available in OT API <v0.19.0
        const context: SpanContext = {
            ...span.spanContext(),
            traceFlags: span.spanContext().traceFlags
        };
        let parentId = parentSpanId ? `|${spanContext.traceId}.${parentSpanId}.` : spanContext.traceId;
        const aiContext = CorrelationContextManager.getCurrentContext();
        if (aiContext) {
            context.traceId = aiContext.operation.id;
            // If parent is no available use current context
            if (!parentSpanId) {
                parentId = aiContext.operation.parentId;
            }
        }
        const correlationContext = CorrelationContextManager.spanToContextObject(context, parentId, name)
        return correlationContext;
    }
}

export const AsyncScopeManager = new OpenTelemetryScopeManagerWrapper();
