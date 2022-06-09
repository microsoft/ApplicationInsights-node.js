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
