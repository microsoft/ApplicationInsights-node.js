"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceMetricsTelemetryProcessor = void 0;
var AutoCollectPerformance = require("../AutoCollection/Performance");
var TelemetryType = require("../Declarations/Contracts");
function performanceMetricsTelemetryProcessor(envelope, client) {
    // If live metrics is enabled, forward all telemetry there
    if (client) {
        client.addDocument(envelope);
    }
    // Increment rate counters (for standard metrics and live metrics)
    switch (envelope.data.baseType) {
        case TelemetryType.TelemetryTypeString.Exception:
            AutoCollectPerformance.countException();
            break;
        case TelemetryType.TelemetryTypeString.Request:
            var requestData = envelope.data.baseData;
            AutoCollectPerformance.countRequest(requestData.duration, requestData.success);
            break;
        case TelemetryType.TelemetryTypeString.Dependency:
            var remoteDependencyData = envelope.data.baseData;
            AutoCollectPerformance.countDependency(remoteDependencyData.duration, remoteDependencyData.success);
            break;
    }
    return true;
}
exports.performanceMetricsTelemetryProcessor = performanceMetricsTelemetryProcessor;
//# sourceMappingURL=PerformanceMetricsTelemetryProcessor.js.map