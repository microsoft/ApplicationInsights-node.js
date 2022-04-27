import { Telemetry } from "./telemetry";
import * as http from "http";
import * as https from "https";

/**
 * Object encapsulating information about the outgoing request
 */
export interface NodeHttpDependencyTelemetry extends Telemetry {
    /**
     * Request options that will be used to instrument outgoing request
     */
    options: string | URL | http.RequestOptions | https.RequestOptions;

    /**
     * Outgoing HTTP request object
     */
    request: http.ClientRequest;
}
