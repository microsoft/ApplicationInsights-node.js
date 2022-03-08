import http = require("http");
import https = require("https");
import TelemetryClient = require("./TelemetryClient");
import ServerRequestTracking = require("../AutoCollection/HttpRequests");
import ClientRequestTracking = require("../AutoCollection/HttpDependencies");
import Logging = require("./Logging");
import Contracts = require("../Declarations/Contracts");

/**
 * Application Insights Telemetry Client for Node.JS. Provides the Application Insights TelemetryClient API
 * in addition to Node-specific helper functions.
 * Construct a new TelemetryClient to have an instance with a different configuration than the default client.
 * In most cases, `appInsights.defaultClient` should be used instead.
 */
class NodeClient extends TelemetryClient {

    /**
     * Log RequestTelemetry from HTTP request and response. This method will log immediately without waiting for request completion
     * and it requires duration parameter to be specified on NodeHttpRequestTelemetry object.
     * Use trackNodeHttpRequest function to log the telemetry after request completion
     * @param telemetry Object encapsulating incoming request, response and duration information
     */
    public trackNodeHttpRequestSync(telemetry: Contracts.NodeHttpRequestTelemetry) {
        if (telemetry && telemetry.request && telemetry.response && telemetry.duration) {
            ServerRequestTracking.trackRequestSync(this, telemetry);
        } else {
            Logging.warn("trackNodeHttpRequestSync requires NodeHttpRequestTelemetry object with request, response and duration specified.");
        }
    }

    /**
     * Log RequestTelemetry from HTTP request and response. This method will `follow` the request to completion.
     * Use trackNodeHttpRequestSync function to log telemetry immediately without waiting for request completion
     * @param telemetry Object encapsulating incoming request and response information
     */
    public trackNodeHttpRequest(telemetry: Contracts.NodeHttpRequestTelemetry) {
        if (telemetry.duration || telemetry.error) {
            Logging.warn("trackNodeHttpRequest will ignore supplied duration and error parameters. These values are collected from the request and response objects.");
        }
        if (telemetry && telemetry.request && telemetry.response) {
            ServerRequestTracking.trackRequest(this, telemetry);
        } else {
            Logging.warn("trackNodeHttpRequest requires NodeHttpRequestTelemetry object with request and response specified.");
        }
    }

    /**
     * Log DependencyTelemetry from outgoing HTTP request. This method will instrument the outgoing request and append
     * the specified headers and will log the telemetry when outgoing request is complete
     * @param telemetry Object encapsulating outgoing request information
     */
    public trackNodeHttpDependency(telemetry: Contracts.NodeHttpDependencyTelemetry) {
        if (telemetry && telemetry.request) {
            ClientRequestTracking.trackRequest(this, telemetry);
        }
        else {
            Logging.warn("trackNodeHttpDependency requires NodeHttpDependencyTelemetry object with request specified.");
        }
    }
}

export = NodeClient