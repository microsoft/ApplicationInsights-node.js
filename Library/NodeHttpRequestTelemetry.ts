import Telemetry = require("./Telemetry")
import http = require("http")

interface NodeHttpRequestTelemetry extends Telemetry
{
    request: http.ServerRequest;
    response: http.ServerResponse;
    duration?: number;
    error?: any
}

export = NodeHttpRequestTelemetry;