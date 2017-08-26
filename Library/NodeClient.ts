import http = require("http")
import https = require("https")
import Client = require("./Client")
import ServerRequestTracking = require("../AutoCollection/ServerRequests")
import ClientRequestTracking = require("../AutoCollection/ClientRequests")
import NodeHttpDependencyTelemetry = require("./NodeHttpDependencyTelemetry")
import NodeHttpRequestTelemetry = require("./NodeHttpRequestTelemetry")
import Logging = require("./Logging")

/**
 * Application Insights telemetry client for Node.JS extends base Client object to provide Node.JS-specific methods
 * to track incoming and outgoing HTTP requests.
 */
class NodeClient extends Client {

    /**
     * Log RequestTelemetry from HTTP request and response. This method will log immediately without waitng for request completion
     * and it requires duration parameter to be specified on NodeHttpRequestTelemetry object.
     * Use trackNodeHttpRequest function to log the telemetry after request completion
     * @param telemetry Object encapsulating incoming request, response and duration information 
     */
    public trackNodeHttpRequestSync(telemetry: NodeHttpRequestTelemetry) {
        if (telemetry && telemetry.request && telemetry.response && telemetry.duration) {
            ServerRequestTracking.trackRequestSync(this, telemetry.request, telemetry.response, telemetry.duration, telemetry.properties, telemetry.error);
        }
        else {
            Logging.warn("trackNodeHttpRequestSync requires NodeHttpRequestTelemetry object with request, response and duration specified.");
        }
    }

    /**
     * Log RequestTelemetry from HTTP request and response. This method will `follow` the request to completion.
     * Use trackNodeHttpRequestSync function to log telemetry immediately without waiting for request completion
     * @param telemetry Object encapsulating incoming request and response information
     */
    public trackNodeHttpRequest(telemetry: NodeHttpRequestTelemetry) {
        if (telemetry && telemetry.request && telemetry.response) {
            ServerRequestTracking.trackRequest(this, telemetry.request, telemetry.response, telemetry.properties);
        }
        else {
            Logging.warn("trackNodeHttpRequest requires NodeHttpRequestTelemetry object with request and response specified.");
        }
    }

    /**
     * Log DependencyTelemetry from outgoing HTTP request. This method will instrument the outgoing request and append
     * the specified headers and will log the telemetry when outgoing request is complete
     * @param telemetry Object encapsulating outgoing request information
     */
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