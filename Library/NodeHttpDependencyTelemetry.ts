import Telemetry = require("./Telemetry")
import http = require("http")
import https = require("https")

interface NodeHttpDependencyTelemetry extends Telemetry
{
    options: string | http.RequestOptions | https.RequestOptions;
    request: http.ClientRequest;
}

export = NodeHttpDependencyTelemetry;