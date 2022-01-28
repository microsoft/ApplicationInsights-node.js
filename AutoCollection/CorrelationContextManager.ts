import events = require("events");
import Logging = require("../Library/Logging");

import * as DiagChannel from "./diagnostic-channel/initialization";
import * as azureFunctionsTypes from "../Library/Functions";

// Don't reference modules from these directly. Use only for types.
import * as cls from "cls-hooked";
import * as http from "http";
import Traceparent = require("../Library/Traceparent");
import Tracestate = require("../Library/Tracestate");
import HttpRequestParser = require("./HttpRequestParser");
import { SpanContext } from "@opentelemetry/api";
import { Span } from "@opentelemetry/sdk-trace-base";

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

export interface CorrelationContext {
    operation: {
        name: string;
        id: string;
        parentId: string; // Always used for dependencies, may be ignored in favor of incoming headers for requests
        traceparent?: Traceparent; // w3c context trace
        tracestate?: Tracestate; // w3c context state
    };

    /** Do not store sensitive information here.
     *  Properties here are exposed via outgoing HTTP headers for correlating data cross-component.
     */
    customProperties: CustomProperties
}

export class CorrelationContextManager {
    private static enabled: boolean = false;
    private static hasEverEnabled: boolean = false;
    private static forceClsHooked: boolean = undefined; // true: use cls-hooked, false: use cls, undefined: choose based on node version
    private static session: cls.Namespace;
    private static cls: typeof cls;
    private static CONTEXT_NAME = "ApplicationInsights-Context";

    /**
     *  Provides the current Context.
     *  The context is the most recent one entered into for the current
     *  logical chain of execution, including across asynchronous calls.
     */
    public static getCurrentContext(): CorrelationContext | null {
        if (!CorrelationContextManager.enabled) {
            return null;
        }
        const context = CorrelationContextManager.session.get(CorrelationContextManager.CONTEXT_NAME);

        if (context === undefined) { // cast undefined to null
            return null;
        }
        return context;
    }

    /**
     *  A helper to generate objects conforming to the CorrelationContext interface
     */
    public static generateContextObject(operationId: string, parentId?: string, operationName?: string, correlationContextHeader?: string, traceparent?: Traceparent, tracestate?: Tracestate): CorrelationContext {
        parentId = parentId || operationId;

        if (this.enabled) {
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

    public static spanToContextObject(spanContext: SpanContext, parentId?: string, name?: string): CorrelationContext {
        const traceContext = new Traceparent();
        traceContext.traceId = spanContext.traceId;
        traceContext.spanId = spanContext.spanId;
        traceContext.traceFlag = Traceparent.formatOpenTelemetryTraceFlags(spanContext.traceFlags) || Traceparent.DEFAULT_TRACE_FLAG;
        traceContext.parentId = parentId;
        return CorrelationContextManager.generateContextObject(traceContext.traceId, traceContext.parentId, name, null, traceContext);
    }

    /**
     *  Runs a function inside a given Context.
     *  All logical children of the execution path that entered this Context
     *  will receive this Context object on calls to GetCurrentContext.
     */
    public static runWithContext(context: CorrelationContext, fn: () => any): any {
        if (CorrelationContextManager.enabled) {
            return CorrelationContextManager.session.bind(fn, { [CorrelationContextManager.CONTEXT_NAME]: context })();
        } else {
            return fn();
        }
    }

    /**
     * Wrapper for cls-hooked bindEmitter method
     */
    public static wrapEmitter(emitter: events.EventEmitter): void {
        if (CorrelationContextManager.enabled) {
            CorrelationContextManager.session.bindEmitter(emitter);
        }
    }

    /**
     *  Patches a callback to restore the correct Context when getCurrentContext
     *  is run within it. This is necessary if automatic correlation fails to work
     *  with user-included libraries.
     *
     *  The supplied callback will be given the same context that was present for
     *  the call to wrapCallback.  */
    public static wrapCallback<T extends Function>(fn: T, context?: CorrelationContext): T {
        if (CorrelationContextManager.enabled) {
            return CorrelationContextManager.session.bind(fn, context ? {
                [CorrelationContextManager.CONTEXT_NAME]: context
            } : undefined);
        }
        return fn;
    }

    /**
     *  Enables the CorrelationContextManager.
     */
    public static enable(forceClsHooked?: boolean) {
        if (this.enabled) {
            return;
        }

        if (!this.isNodeVersionCompatible()) {
            this.enabled = false;
            return;
        }
        if (!CorrelationContextManager.hasEverEnabled) {
            this.forceClsHooked = forceClsHooked;
            this.hasEverEnabled = true;

            if (typeof this.cls === "undefined") {
                if ((CorrelationContextManager.forceClsHooked === true) || (CorrelationContextManager.forceClsHooked === undefined && CorrelationContextManager.shouldUseClsHooked())) {
                    this.cls = require('cls-hooked');
                } else {
                    this.cls = require('continuation-local-storage');
                }
            }

            CorrelationContextManager.session = this.cls.createNamespace("AI-CLS-Session");

            DiagChannel.registerContextPreservation((cb) => {
                return CorrelationContextManager.session.bind(cb);
            });
        }

        this.enabled = true;
    }

    /**
     * Create new correlation context.
     */
    public static startOperation(
        input: azureFunctionsTypes.Context | (http.IncomingMessage | azureFunctionsTypes.HttpRequest) | SpanContext | Span,
        request?: azureFunctionsTypes.HttpRequest | string)
        : CorrelationContext | null {
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

        // AzFunction TraceContext
        if (traceContext) {
            let traceparent = null;
            let tracestate = null;
            if ((request as azureFunctionsTypes.HttpRequest).headers) {
                if ((request as azureFunctionsTypes.HttpRequest).headers.traceparent) {
                    traceparent = new Traceparent((request as azureFunctionsTypes.HttpRequest).headers.traceparent);
                } else if ((request as azureFunctionsTypes.HttpRequest).headers["request-id"]) {
                    traceparent = new Traceparent(null, (request as azureFunctionsTypes.HttpRequest).headers["request-id"]);
                }
                if ((request as azureFunctionsTypes.HttpRequest).headers.tracestate) {
                    tracestate = new Tracestate((request as azureFunctionsTypes.HttpRequest).headers.tracestate);
                }
            }
            if (!traceparent) {
                traceparent = new Traceparent(traceContext.traceparent);
            }
            if (!tracestate) {
                tracestate = new Tracestate(traceContext.tracestate);
            }
            const parser = typeof request === "object"
                ? new HttpRequestParser(request)
                : null;
            const correlationContext = CorrelationContextManager.generateContextObject(
                traceparent.traceId,
                traceparent.parentId,
                typeof request === "string"
                    ? request
                    : parser.getOperationName({}),
                parser && parser.getCorrelationContextHeader() || undefined,
                traceparent,
                tracestate,
            );

            return correlationContext;
        }

        // No TraceContext available, parse as http.IncomingMessage
        if (headers) {
            const traceparent = new Traceparent(headers.traceparent ? headers.traceparent.toString() : null);
            const tracestate = new Tracestate(headers.tracestate ? headers.tracestate.toString() : null);
            const parser = new HttpRequestParser(input as http.IncomingMessage | azureFunctionsTypes.HttpRequest);
            const correlationContext = CorrelationContextManager.generateContextObject(
                traceparent.traceId,
                traceparent.parentId,
                parser.getOperationName({}),
                parser.getCorrelationContextHeader(),
                traceparent,
                tracestate,
            );

            return correlationContext;
        }

        Logging.warn("startOperation was called with invalid arguments", arguments);
        return null;
    }

    /**
     *  Disables the CorrelationContextManager.
     */
    public static disable() {
        this.enabled = false;
    }

    /**
     * Reset the namespace
     */
    public static reset() {
        if (CorrelationContextManager.hasEverEnabled) {
            CorrelationContextManager.session = null;
            CorrelationContextManager.session = this.cls.createNamespace('AI-CLS-Session');
        }
    }

    /**
     *  Reports if CorrelationContextManager is able to run in this environment
     */
    public static isNodeVersionCompatible() {
        var nodeVer = process.versions.node.split(".");
        return parseInt(nodeVer[0]) > 3 || (parseInt(nodeVer[0]) > 2 && parseInt(nodeVer[1]) > 2);

    }

    /**
     * We only want to use cls-hooked when it uses async_hooks api (8.2+), else
     * use async-listener (plain -cls)
     */
    public static shouldUseClsHooked() {
        var nodeVer = process.versions.node.split(".");
        return (parseInt(nodeVer[0]) > 8) || (parseInt(nodeVer[0]) >= 8 && parseInt(nodeVer[1]) >= 2);
    }

    /**
     * A TypeError is triggered by cls-hooked for node [8.0, 8.2)
     * @internal Used in tests only
     */
    public static canUseClsHooked() {
        var nodeVer = process.versions.node.split(".");
        var greater800 = (parseInt(nodeVer[0]) > 8) || (parseInt(nodeVer[0]) >= 8 && parseInt(nodeVer[1]) >= 0);
        var less820 = (parseInt(nodeVer[0]) < 8) || (parseInt(nodeVer[0]) <= 8 && parseInt(nodeVer[1]) < 2)
        var greater470 = parseInt(nodeVer[0]) > 4 || (parseInt(nodeVer[0]) >= 4 && parseInt(nodeVer[1]) >= 7) // cls-hooked requires node 4.7+
        return !(greater800 && less820) && greater470;
    }
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
        return this.props.map((keyval) => {
            return `${keyval.key}=${keyval.value}`
        }).join(", ");
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
            Logging.warn("Correlation context property keys and values must not contain ',' or '='. setProperty was called with key: " + prop + " and value: " + val);
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