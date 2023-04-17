/// <reference types="node" />
import { Telemetry } from "./Telemetry";
import http = require("http");
import https = require("https");
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
    /**
     * Flag to determine if telemetry had been processed.
     */
    isProcessed?: boolean;
}
