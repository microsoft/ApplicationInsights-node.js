import Contracts = require("../Declarations/Contracts");
import AutoCollecPreAggregatedMetrics = require("../AutoCollection/PreAggregatedMetrics");
import * as TelemetryType from "../Declarations/Contracts";

export function preAggregatedMetricsTelemetryProcessor(envelope: Contracts.EnvelopeTelemetry): boolean {
    // Increment rate counters (for standard metrics and live metrics)
    switch (envelope.data.baseType) {
        case TelemetryType.TelemetryTypeString.Exception:
            const exceptionData: Contracts.ExceptionData = (envelope.data as any).baseData;
            exceptionData.properties = {
                ...exceptionData.properties,
                "_MS.ProcessedByMetricExtractors": "(Name:'Exceptions', Ver:'1.1')"
            }
            AutoCollecPreAggregatedMetrics.countException();
            break;
        case TelemetryType.TelemetryTypeString.Request:
            const requestData: Contracts.RequestData = (envelope.data as any).baseData;
            requestData.properties = {
                ...requestData.properties,
                "_MS.ProcessedByMetricExtractors": "(Name:'Requests', Ver:'1.1')"
            }
            AutoCollecPreAggregatedMetrics.countRequest(requestData.duration, requestData.success);
            break;
        case TelemetryType.TelemetryTypeString.Dependency:
            const remoteDependencyData: Contracts.RemoteDependencyData = (envelope.data as any).baseData;
            remoteDependencyData.properties = {
                ...remoteDependencyData.properties,
                "_MS.ProcessedByMetricExtractors": "(Name:'Dependencies', Ver:'1.1')"
            }
            AutoCollecPreAggregatedMetrics.countDependency(remoteDependencyData.duration, remoteDependencyData.success);
            break;
    }
    return true;
}
