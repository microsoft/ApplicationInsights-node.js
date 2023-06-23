import * as events from "events";
import * as http from "http";
import * as api from "@opentelemetry/api";

import { ICorrelationContext, ITraceparent, ITracestate, HttpRequest } from "./types";
import { Logger } from "../shared/logging";

export class CorrelationContextManager {
    /**
     *  Provides the current Context.
     *  The context is the most recent one entered into for the current
     *  logical chain of execution, including across asynchronous calls.
     */
    public getCurrentContext(): ICorrelationContext | null {
        const context = api.context.active();
        const operationId = context.getValue(Symbol("traceId"));

        // Null check here as if operationId isn't defined we can't generate the context object
        if (operationId) {
            // TODO: Add support for remaining parameters of the generateContextObject() method
            const correlationContext: ICorrelationContext = this.generateContextObject(
                String(operationId),
                String(context.getValue(Symbol("parentId"))),
                String(context.getValue(Symbol("operationName")))
            );

            return correlationContext;
        }
        
        return null;
    }

    /**
     *  A helper to generate objects conforming to the CorrelationContext interface
     */
    public generateContextObject(
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
                parentId: parentId
            },
            customProperties: null
        }
    }

    private _parseContextObject(context: ICorrelationContext): api.Context {
        let openTelemetryContext: api.Context;

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
    public runWithContext(context: ICorrelationContext, fn: () => any): any {
        // TODO: figure out how to take an ICorrelationContext, convert to OTel Context, then call the .with() method
        // TODO: Create helper functions for converting ICorrelationContext <=> Context

        const openTelemetryContext: api.Context = this._parseContextObject(context);
        return api.context.with(openTelemetryContext, fn);
    }

    /**
     * Wrapper for cls-hooked bindEmitter method
     */
    public wrapEmitter(emitter: events.EventEmitter): void {
        throw new Error("Not implemented");
    }

    /**
     *  Patches a callback to restore the correct Context when getCurrentContext
     *  is run within it. This is necessary if automatic correlation fails to work
     *  with user-included libraries.
     *
     *  The supplied callback will be given the same context that was present for
     *  the call to wrapCallback.  */
    public wrapCallback<T>(fn: T, context?: ICorrelationContext): T {
        throw new Error("Not implemented");
    }

    /**
     *  Enables the CorrelationContextManager.
     */
    public enable(forceClsHooked?: boolean) {
        Logger.getInstance().info("Enabling the context manager is no longer necessary and this method is a no-op.");
    }

    /**
     * Create new correlation context.
     */
    public startOperation(
        context: Context | (http.IncomingMessage | HttpRequest) | api.SpanContext,
        request?: HttpRequest | string
    ): ICorrelationContext | null {
        throw new Error("Not implemented");
    }

    /**
     *  Disables the CorrelationContextManager.
     */
    public disable() {
        api.context.disable();
    }

    /**
     * Reset the namespace
     */
    public reset() {
        throw new Error("Not implemented");
    }
}
