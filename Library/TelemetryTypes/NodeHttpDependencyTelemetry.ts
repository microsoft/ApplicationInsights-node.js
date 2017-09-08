import Telemetry = require("./Telemetry")
import http = require("http")
import https = require("https")

/**
 * Object encapsulating information about the outgoing request
 */
interface NodeHttpDependencyTelemetry extends Telemetry
{
    /**
     * Request options that will be used to instrument outgoing request
     */
    options: string | http.RequestOptions | https.RequestOptions;

    /**
     * Outgoing HTTP request object
     */
    request: http.ClientRequest;
}

export = NodeHttpDependencyTelemetry;