interface Telemetry {
    /**
     * Telemetry time stamp
     */
    time?: Date;
    /**
     * Additional data used to filter events and metrics in the portal. Defaults to empty.
     */
    properties?: { [key: string]: string; };
    /**
     * An event-specific context that will be passed to telemetry processors handling this event before it is sent. For a context spanning your entire operation, consider appInsights.getCorrelationContext
     */
    contextObjects?: { [name: string]: any; };
    /**
     * The context tags to use for this telemetry which overwrite default context values
     */
    tagOverrides?: { [key: string]: string; };

    /**
     * Telemetry type
     */
    type: string;
}

export = Telemetry;