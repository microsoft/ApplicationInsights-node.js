import { Telemetry } from "./Telemetry";

/**
 * Telemetry about the incoming request processed by the application
 */
export interface RequestTelemetry extends Telemetry {
     /** Identifier of a request call instance. Used for correlation between request and other telemetry items. */
     id: string;
     /** Name of the request. Represents code path taken to process request. Low cardinality value to allow better grouping of requests. For HTTP requests it represents the HTTP method and URL path template like 'GET /values/{id}'. */
     name?: string;
     /** Request duration in ms. */
     duration: number;
     /** Indication of successful or unsuccessful call. */
     success: boolean;
     /** Result of a request execution. HTTP status code for HTTP requests. */
     resultCode: string;
     /** Source of the request. Examples are the instrumentation key of the caller or the ip address of the caller. */
     source?: string;
     /** Request URL with all query string parameters. */
     url?: string;
     /** Collection of custom measurements. */
     measurements?: { [propertyName: string]: number };
}