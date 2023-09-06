// NOTE: These types are the only parts of "@azure/functions" referenced/exported from the "applicationinsights" package
// This is done so that the "applicationinsights" package does not need a direct dependency on "@azure/functions"
// These types should be compatible with both functions model v3 and model v4

/**
 * The context object can be used for writing logs, reading data from bindings, setting outputs and using
 * the context.done callback when your exported function is synchronous. A context object is passed
 * to your function from the Azure Functions runtime on function invocation.
 */
export interface Context {
    /**
     * A unique GUID per function invocation.
     */
    invocationId?: string;
    /**
    * TraceContext information to enable distributed tracing scenarios.
    */
    traceContext: TraceContext;
}

/**
 * HTTP request object. Provided to your function when using HTTP Bindings.
 */
export interface HttpRequest {
    method: string | null;
    url: string;
    headers: { [key: string]: string; };
}

export type TraceContext = V3TraceContext & V4TraceContext;

/**
 * TraceContext information to enable distributed tracing scenarios.
 */
export interface V3TraceContext {
    /** Describes the position of the incoming request in its trace graph in a portable, fixed-length format. */
    traceparent?: string | null;
    /** Extends traceparent with vendor-specific data. */
    tracestate?: string | null;
    /** Holds additional properties being sent as part of request telemetry. */
    attributes?: {
        [k: string]: string;
    } | null;
}

/**
 * TraceContext information to enable distributed tracing scenarios.
 */
export interface V4TraceContext {
    /** Describes the position of the incoming request in its trace graph in a portable, fixed-length format. */
    traceParent?: string | null;
    /** Extends traceparent with vendor-specific data. */
    traceState?: string | null;
    /** Holds additional properties being sent as part of request telemetry. */
    attributes?: {
        [k: string]: string;
    } | null;
}