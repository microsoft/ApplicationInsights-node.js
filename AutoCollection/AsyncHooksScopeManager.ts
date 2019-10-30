import { CorrelationContextManager, CorrelationContext } from "./CorrelationContextManager"
import { ISpanContext } from "diagnostic-channel";
import { EventEmitter } from "events";

export interface Span {
    _duration: [number, number];
    name: string;
    parentSpanId?: string;
    status: { code: number, message?: string },
    attributes: Record<string, string>,
    context: () => {
        traceId: string;
        spanId: string;
        traceFlags?: { toString: () => string };
        tracestate?: string;
    }
    kind: number // 1: SERVER, 2: CLIENT
}

export class OpenTelemetryScopeManagerWrapper {
    public active() {
        return CorrelationContextManager.getCurrentContext();
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
