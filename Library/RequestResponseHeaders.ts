export = {
    /**
     * Source instrumentation header that is added by an application while making http
     * requests and retrieved by the other application when processing incoming requests.
     */
    sourceInstrumentationKeyHeader: "x-ms-request-source-ikey",

    /**
     * Target instrumentation header that is added to the response and retrieved by the
     * calling application when processing incoming responses.
     */
    targetInstrumentationKeyHeader: "x-ms-request-target-ikey",
}
