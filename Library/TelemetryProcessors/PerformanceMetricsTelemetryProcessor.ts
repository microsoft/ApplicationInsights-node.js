import * as TelemetryType from "../../Declarations/Contracts";
import { TelemetryItem as Envelope } from "../../Declarations/Generated";
import { TelemetryClient } from "../../applicationinsights";

export function performanceMetricsTelemetryProcessor(envelope: Envelope, client: TelemetryClient): boolean {
    // If live metrics is enabled, forward all telemetry there
    if (client.quickPulseClient) {
        client.quickPulseClient.addDocument(envelope);
    }
    // Increment rate counters (for standard metrics and live metrics)
    switch (envelope.data.baseType) {
        case TelemetryType.TelemetryTypeString.Exception:
            client.metricHandler.countPerformanceException();
            break;
        case TelemetryType.TelemetryTypeString.Request:
            const requestData = (envelope.data as any).baseData;
            client.metricHandler.countPerformanceRequest(requestData.duration, requestData.success);
            break;
        case TelemetryType.TelemetryTypeString.Dependency:
            const remoteDependencyData = (envelope.data as any).baseData;
            client.metricHandler.countPerformanceDependency(remoteDependencyData.duration, remoteDependencyData.success);
            break;
    }
    return true;
}
