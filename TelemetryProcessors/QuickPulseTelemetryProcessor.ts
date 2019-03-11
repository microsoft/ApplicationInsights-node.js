import Contracts = require("../Declarations/Contracts");
import Logging = require("../Library/Logging");
import QuickPulseStateManager = require("../Library/QuickPulseStateManager")
import AutoCollectPerformance = require("../AutoCollection/Performance");

export function quickPulseTelemetryProcessor(envelope: Contracts.Envelope, client?: QuickPulseStateManager): boolean {
    if (client) {
        client.addDocument(envelope);

        // Increment rate counters
        switch (envelope.data.baseType) {
            case "ExceptionData":
                AutoCollectPerformance.countException();
                break;
            case "RequestData":
                // These are already autocounted by HttpRequest.
                // Note: Not currently counting manual trackRequest calls
                // here to avoid affecting existing autocollection metrics
                break;
            case "RemoteDependencyData":
                const baseData: Contracts.DependencyTelemetry = (envelope.data as any).baseData;
                AutoCollectPerformance.countDependency(baseData.duration, baseData.success);
                break;
        }
    }
    return true;
}
