import Contracts = require("../Declarations/Contracts");
import Logging = require("../Library/Logging");
import QuickPulseStateManager = require("../Library/QuickPulseStateManager")
import AutoCollectPerformance = require("../AutoCollection/Performance");

export function performanceMetricsTelemetryProcessor(envelope: Contracts.Envelope, client?: QuickPulseStateManager): boolean {
    // If live metrics is enabled, forward all telemetry there
    if (client) {
        client.addDocument(envelope);
    }

    // Increment rate counters (for standard metrics and live metrics)
    switch (envelope.data.baseType) {
        case "ExceptionData":
            AutoCollectPerformance.countException();
            break;
        case "RequestData":
            const requestData: Contracts.RequestData = (envelope.data as any).baseData;
            AutoCollectPerformance.countRequest(requestData.duration, requestData.success);
            break;
        case "RemoteDependencyData":
            const remoteDependencyData: Contracts.RemoteDependencyData = (envelope.data as any).baseData;
            AutoCollectPerformance.countDependency(remoteDependencyData.duration, remoteDependencyData.success);
            break;
    }
    return true;
}
