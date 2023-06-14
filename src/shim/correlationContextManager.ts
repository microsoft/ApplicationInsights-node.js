import * as events from "events";
import * as http from "http";
import * as api from "@opentelemetry/api";

import { AsyncHooksContextManager } from "@opentelemetry/context-async-hooks";
import { ICorrelationContext, ITraceparent, ITracestate, Context, HttpRequest } from "./types";

export class CorrelationContextManager {
    private _enabled = false;
    private _contextManager = new AsyncHooksContextManager();

    /**
     *  Provides the current Context.
     *  The context is the most recent one entered into for the current
     *  logical chain of execution, including across asynchronous calls.
     */
    public getCurrentContext(): ICorrelationContext | null {
        if (!this._enabled) {
            return null;
        }

        const context = this._contextManager.active();
        const operationId = context.getValue(Symbol("traceId"));

        // Null check here as if operationId isn't defined we can't generate the context object
        if (operationId) {
            // TODO: Add support for remaining parameters of the generateContextObject() method
            const ourContext: ICorrelationContext = this.generateContextObject(
                String(operationId),
                String(context.getValue(Symbol("parentId"))),
                String(context.getValue(Symbol("operationName"))),
                String(context.getValue(Symbol("correlationContextHeader"))),
            );

            return ourContext;
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

        if (this._enabled) {
            return {
                operation: {
                    name: operationName,
                    id: operationId,
                    parentId: parentId,
                    traceparent,
                    tracestate
                },
                customProperties: new CustomPropertiesImpl(correlationContextHeader)
            };
        }
        return null;
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
    public wrapCallback<T>(fn: T, context?: ICorrelationContext): T {
        throw new Error("Not implemented");
    }

    /**
     *  Enables the CorrelationContextManager.
     */
    public enable(forceClsHooked?: boolean) {
        // TODO: Is forceClsHooked relevant since we're using OTel's context manager?
        this._contextManager.enable();
        this._enabled = true;
        api.context.setGlobalContextManager(this._contextManager);
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
        this._contextManager.disable();
    }

    /**
     * Reset the namespace
     */
    public reset() {
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
            // Logging.warn("Correlation context property keys and values must not contain ',' or '='. setProperty was called with key: " + prop + " and value: " + val);
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