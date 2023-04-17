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
    /**
     * HTTP request object. Provided to your function when using HTTP Bindings.
     */
    req?: HttpRequest;
    /**
     * HTTP response object. Provided to your function when using HTTP Bindings.
     */
    res?: {
        [key: string]: any;
    };
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
    attributes: {
        [k: string]: string;
    } | null | undefined;
}
