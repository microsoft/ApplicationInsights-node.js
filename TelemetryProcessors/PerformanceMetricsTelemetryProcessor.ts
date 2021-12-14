import { EnvelopeTelemetry, RequestData, RemoteDependencyData } from "../Declarations/Contracts";
import * as TelemetryType from "../Declarations/Contracts";
import { TelemetryClient } from "../applicationinsights";

export function performanceMetricsTelemetryProcessor(envelope: EnvelopeTelemetry, client: TelemetryClient): boolean {
    // If live metrics is enabled, forward all telemetry there
    if (client.quickPulseClient) {
        client.quickPulseClient.addDocument(envelope);
    }
    // Increment rate counters (for standard metrics and live metrics)
    switch (envelope.data.baseType) {
        case TelemetryType.TelemetryTypeString.Exception:
            client.autoCollector.countPerformanceException();
            break;
        case TelemetryType.TelemetryTypeString.Request:
            const requestData: RequestData = (envelope.data as any).baseData;
            client.autoCollector.countPerformanceRequest(requestData.duration, requestData.success);
            break;
        case TelemetryType.TelemetryTypeString.Dependency:
            const remoteDependencyData: RemoteDependencyData = (envelope.data as any).baseData;
            client.autoCollector.countPerformanceDependency(remoteDependencyData.duration, remoteDependencyData.success);
            break;
    }
    return true;
}
