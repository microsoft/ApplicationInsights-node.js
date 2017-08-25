import http = require("http")
import https = require("https")
import Client = require("./Client")
import ServerRequestTracking = require("../AutoCollection/ServerRequests")
import ClientRequestTracking = require("../AutoCollection/ClientRequests")
import NodeHttpDependencyTelemetry = require("./NodeHttpDependencyTelemetry")
import NodeHttpRequestTelemetry = require("./NodeHttpRequestTelemetry")
import Logging = require("./Logging")

class NodeClient extends Client {
    public trackNodeHttpRequestSync(telemetry: NodeHttpRequestTelemetry) {
        if (telemetry && telemetry.request && telemetry.response && telemetry.duration) {
            ServerRequestTracking.trackRequestSync(this, telemetry.request, telemetry.response, telemetry.duration, telemetry.properties, telemetry.error);
        }
        else {
            Logging.warn("trackNodeHttpRequestSync requires NodeHttpRequestTelemetry object with request, response and duration specified.");
        }
    }

    public trackNodeHttpRequest(telemetry: NodeHttpRequestTelemetry) {
        if (telemetry && telemetry.request && telemetry.response) {
            ServerRequestTracking.trackRequest(this, telemetry.request, telemetry.response, telemetry.properties);
        }
        else {
            Logging.warn("trackNodeHttpRequest requires NodeHttpRequestTelemetry object with request and response specified.");
        }
    }
    public trackNodeHttpDependency(telemetry: NodeHttpDependencyTelemetry) {
        if (telemetry && telemetry.request) {
            ClientRequestTracking.trackRequest(this, telemetry.options, telemetry.request, telemetry.properties);
        }
        else {
            Logging.warn("trackNodeHttpDependency requires NodeHttpDependencyTelemetry object with request specified.");
        }
    }
}

export = NodeClient