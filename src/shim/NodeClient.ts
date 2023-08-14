import { Logger } from "./logging";
import { Contracts, TelemetryClient } from "./shim-applicationinsights";

class NodeClient extends TelemetryClient {
    /**
     * Log RequestTelemetry from HTTP request and response. This method will log immediately without waiting for request completion
     * and it requires duration parameter to be specified on NodeHttpRequestTelemetry object.
     * Use trackNodeHttpRequest function to log the telemetry after request completion
     * @param telemetry Object encapsulating incoming request, response and duration information
     */
    public trackNodeHttpRequestSync(telemetry: Contracts.NodeHttpRequestTelemetry) {
        Logger.getInstance().warn("trackNodeHttpRequestSync is not implemented and is a no-op.");
    }
    
    /**
     * Log RequestTelemetry from HTTP request and response. This method will `follow` the request to completion.
     * Use trackNodeHttpRequestSync function to log telemetry immediately without waiting for request completion
     * @param telemetry Object encapsulating incoming request and response information
     */
    public trackNodeHttpRequest(telemetry: Contracts.NodeHttpRequestTelemetry) {
        Logger.getInstance().warn("trackNodeHttpRequest is not implemented and is a no-op.");
    }
    
    /**
     * Log DependencyTelemetry from outgoing HTTP request. This method will instrument the outgoing request and append
     * the specified headers and will log the telemetry when outgoing request is complete
     * @param telemetry Object encapsulating outgoing request information
     */
    public trackNodeHttpDependency(telemetry: Contracts.NodeHttpRequestTelemetry) {
        Logger.getInstance().warn("trackNodeHttpDependency is not implemented and is a no-op.");
    }
}

export = NodeClient;
