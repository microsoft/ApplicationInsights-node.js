import { Domain } from "./Domain";

/**
 * An instance of Request represents completion of an external request to the application to do work and contains a summary of that request execution and the results.
 */
export class RequestData extends Domain {

    /**
     * Schema version
     */
    public ver: number;

    /**
     * Identifier of a request call instance. Used for correlation between request and other telemetry items.
     */
    public id: string;

    /**
     * Source of the request. Examples are the instrumentation key of the caller or the ip address of the caller.
     */
    public source: string;

    /**
     * Name of the request. Represents code path taken to process request. Low cardinality value to allow better grouping of requests. For HTTP requests it represents the HTTP method and URL path template like 'GET /values/{id}'.
     */
    public name: string;

    /**
     * Request duration in format: DD.HH:MM:SS.MMMMMM. Must be less than 1000 days.
     */
    public duration: string;

    /**
     * Result of a request execution. HTTP status code for HTTP requests.
     */
    public responseCode: string;

    /**
     * Indication of successfull or unsuccessfull call.
     */
    public success: boolean;

    /**
     * Request URL with all query string parameters.
     */
    public url: string;

    /**
     * Collection of custom properties.
     */
    public properties: any;

    /**
     * Collection of custom measurements.
     */
    public measurements: any;

    constructor() {
        super();

        this.ver = 2;
        this.properties = {};
        this.measurements = {};
    }
}
