import http = require("http")
import https = require("https")
import Client = require("./Client")
import ServerRequestTracking = require("../AutoCollection/ServerRequests")
import ClientRequestTracking = require("../AutoCollection/ClientRequests")
import NodeHttpDependencyTelemetry = require("./NodeHttpDependencyTelemetry")
import NodeHttpRequestTelemetry = require("./NodeHttpRequestTelemetry")

class NodeClient extends Client {
    public trackNodeHttpRequestSync(telemetry: NodeHttpRequestTelemetry) {
        ServerRequestTracking.trackRequestSync(this, telemetry.request, telemetry.response, telemetry.duration, telemetry.properties, telemetry.error);
    }
    public trackNodeHttpRequest(telemetry: NodeHttpRequestTelemetry) {
        ServerRequestTracking.trackRequest(this, telemetry.request, telemetry.response, telemetry.properties);
    }
    public trackNodeHttpDependency(telemetry: NodeHttpDependencyTelemetry) {
        ClientRequestTracking.trackRequest(this, telemetry.options, telemetry.request, telemetry.properties);
    }
}

export = NodeClient