import * as events from "events";
import * as http from "http";
import { context, Context, SpanContext, createContextKey } from "@opentelemetry/api";
import { ICorrelationContext, ITraceparent, ITracestate, HttpRequest, OpenTelmetrySpan } from "./types";
import { Logger } from "../shared/logging";

export class CorrelationContextManager {
    /**
     *  Provides the current Context.
     *  The context is the most recent one entered into for the current
     *  logical chain of execution, including across asynchronous calls.
     */
    public static getCurrentContext(): ICorrelationContext {
        const ctx = context.active();

        // TODO: Add support for remaining parameters of the generateContextObject() method
        const spanContextKey = createContextKey('OpenTelemetry Context Key SPAN');
        const span: OpenTelmetrySpan = ctx.getValue(spanContextKey) as OpenTelmetrySpan;

        // TODO: Convert OTel TraceState => ITraceState before passing

        return this.generateContextObject(
            span._spanContext.traceId
        );
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
            // TODO: Pass the correlationContextHeader to the customProperties creation method
            customProperties: null
        }
    }

    private static _parseContextObject(context: ICorrelationContext): Context {
        let openTelemetryContext: Context;

        openTelemetryContext.setValue(Symbol("operationId"), context.operation.id);
        openTelemetryContext.setValue(Symbol("operationName"), context.operation.name);
        openTelemetryContext.setValue(Symbol("parentId"), context.operation.parentId);

        return openTelemetryContext;
    }

    /**
     *  Runs a function inside a given Context.
     *  All logical children of the execution path that entered this Context
     *  will receive this Context object on calls to GetCurrentContext.
     */
    public static runWithContext(ctx: ICorrelationContext, fn: () => any): any {
        // TODO: figure out how to take an ICorrelationContext, convert to OTel Context, then call the .with() method
        // TODO: Create helper functions for converting ICorrelationContext <=> Context

        const openTelemetryContext: Context = this._parseContextObject(ctx);
        return context.with(openTelemetryContext, fn);
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
