// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum DistributedTracingModes {
    /**
     * Send Application Insights correlation headers
     */
    AI = 0,

    /**
     * (Default) Send both W3C Trace Context headers and back-compatibility Application Insights headers
     */
    AI_AND_W3C
}

/**
 * Interface which defines which specific extended metrics should be disabled
 *
 * @export
 * @interface IDisabledExtendedMetrics
 */
export interface IDisabledExtendedMetrics {
    gc?: boolean;
    heap?: boolean;
    loop?: boolean;
}


export interface ITraceparent {
    legacyRootId: string;
    parentId: string;
    spanId: string;
    traceFlag: string;
    traceId: string;
    version: string;
}

export interface ITracestate {
    fieldmap: string[];
}

export interface ICorrelationContext {
    operation: {
        name: string;
        id: string;
        parentId: string; // Always used for dependencies, may be ignored in favor of incoming headers for requests
        traceparent?: ITraceparent; // w3c context trace
        tracestate?: ITracestate; // w3c context state
    };
    /** Do not store sensitive information here.
     *  Properties here are exposed via outgoing HTTP headers for correlating data cross-component.
     */
    customProperties: ICustomProperties;
}

export interface ICustomProperties {
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

/**
 * The context object can be used for writing logs, reading data from bindings, setting outputs and using
 * the context.done callback when your exported function is synchronous. A context object is passed
 * to your function from the Azure Functions runtime on function invocation.
 */
export interface Context {
    traceContext: TraceContext;
}

/**
 * HTTP request object. Provided to your function when using HTTP Bindings.
 */
export interface HttpRequest {
    method: string | null;
    url: string;
    headers: {
        [key: string]: string;
    };
}

/**
 * TraceContext information to enable distributed tracing scenarios.
 */
export interface TraceContext {
    /** Describes the position of the incoming request in its trace graph in a portable, fixed-length format. */
    traceparent: string | null | undefined;
    /** Extends traceparent with vendor-specific data. */
    tracestate: string | null | undefined;
    /** Holds additional properties being sent as part of request telemetry. */
    attributes:
    | {
        [k: string]: string;
    }
    | null
    | undefined;
}
