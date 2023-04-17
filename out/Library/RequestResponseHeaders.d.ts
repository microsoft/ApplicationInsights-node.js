declare const _default: {
    /**
     * Request-Context header
     */
    requestContextHeader: string;
    /**
     * Source instrumentation header that is added by an application while making http
     * requests and retrieved by the other application when processing incoming requests.
     */
    requestContextSourceKey: string;
    /**
     * Target instrumentation header that is added to the response and retrieved by the
     * calling application when processing incoming responses.
     */
    requestContextTargetKey: string;
    /**
     * Request-Id header
     */
    requestIdHeader: string;
    /**
     * Legacy Header containing the id of the immediate caller
     */
    parentIdHeader: string;
    /**
     * Legacy Header containing the correlation id that kept the same for every telemetry item
     * across transactions
     */
    rootIdHeader: string;
    /**
     * Correlation-Context header
     *
     * Not currently actively used, but the contents should be passed from incoming to outgoing requests
     */
    correlationContextHeader: string;
    /**
     * W3C distributed tracing protocol header
     */
    traceparentHeader: string;
    /**
     * W3C distributed tracing protocol state header
     */
    traceStateHeader: string;
};
export = _default;
