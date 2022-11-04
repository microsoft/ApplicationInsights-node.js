import * as events from "events";
import * as http from "http";

import { SpanContext } from "@opentelemetry/api";

import * as azureFunctionsTypes from "../declarations/functions";
import { ICorrelationContext, ITraceparent, ITracestate } from "../declarations/interfaces";

export class CorrelationContextManager {
    /**
     *  Provides the current Context.
     *  The context is the most recent one entered into for the current
     *  logical chain of execution, including across asynchronous calls.
     */
    public getCurrentContext(): ICorrelationContext | null {
        throw new Error("Not implemented");
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
        throw new Error("Not implemented");
    }

    /**
     *  Runs a function inside a given Context.
     *  All logical children of the execution path that entered this Context
     *  will receive this Context object on calls to GetCurrentContext.
     */
    public runWithContext(context: ICorrelationContext, fn: () => any): any {
        throw new Error("Not implemented");
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
    public wrapCallback<T extends Function>(fn: T, context?: ICorrelationContext): T {
        throw new Error("Not implemented");
    }

    /**
     *  Enables the CorrelationContextManager.
     */
    public enable(forceClsHooked?: boolean) {
        throw new Error("Not implemented");
    }

    /**
     * Create new correlation context.
     */
    public startOperation(
        context:
            | azureFunctionsTypes.Context
            | (http.IncomingMessage | azureFunctionsTypes.HttpRequest)
            | SpanContext,
        request?: azureFunctionsTypes.HttpRequest | string
    ): ICorrelationContext | null {
        throw new Error("Not implemented");
    }

    /**
     *  Disables the CorrelationContextManager.
     */
    public disable() {
        throw new Error("Not implemented");
    }

    /**
     * Reset the namespace
     */
    public reset() {
        throw new Error("Not implemented");
    }
}
