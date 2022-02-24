import Contracts = require("../Declarations/Contracts");
import AutoCollecPreAggregatedMetrics = require("../AutoCollection/PreAggregatedMetrics");
import * as TelemetryType from "../Declarations/Contracts";
import {
    MetricDependencyDimensions,
    MetricExceptionDimensions,
    MetricRequestDimensions,
    MetricTraceDimensions
} from "../Declarations/Metrics/AggregatedMetricDimensions";
import Context = require("../Library/Context");

export function preAggregatedMetricsTelemetryProcessor(envelope: Contracts.EnvelopeTelemetry, context: Context): boolean {
    if (AutoCollecPreAggregatedMetrics.isEnabled()) {
        // Increment rate counters
        switch (envelope.data.baseType) {
            case TelemetryType.TelemetryTypeString.Exception:
                const exceptionData: Contracts.ExceptionData = (envelope.data as any).baseData;
                exceptionData.properties = {
                    ...exceptionData.properties,
                    "_MS.ProcessedByMetricExtractors": "(Name:'Exceptions', Ver:'1.1')"
                };
                let exceptionDimensions: MetricExceptionDimensions = {
                    cloudRoleInstance: envelope.tags[context.keys.cloudRoleInstance],
                    cloudRoleName: envelope.tags[context.keys.cloudRole]
                };
                AutoCollecPreAggregatedMetrics.countException(exceptionDimensions);
                break;
            case TelemetryType.TelemetryTypeString.Trace:
                const traceData: Contracts.TraceTelemetry = (envelope.data as any).baseData;
                traceData.properties = {
                    ...traceData.properties,
                    "_MS.ProcessedByMetricExtractors": "(Name:'Traces', Ver:'1.1')"
                }
                let traceDimensions: MetricTraceDimensions = {
                    cloudRoleInstance: envelope.tags[context.keys.cloudRoleInstance],
                    cloudRoleName: envelope.tags[context.keys.cloudRole],
                    traceSeverityLevel: Contracts.SeverityLevel[traceData.severity]
                };
                AutoCollecPreAggregatedMetrics.countTrace(traceDimensions);
                break;
            case TelemetryType.TelemetryTypeString.Request:
                const requestData: Contracts.RequestData = (envelope.data as any).baseData;
                requestData.properties = {
                    ...requestData.properties,
                    "_MS.ProcessedByMetricExtractors": "(Name:'Requests', Ver:'1.1')"
                }
                let requestDimensions: MetricRequestDimensions = {
                    cloudRoleInstance: envelope.tags[context.keys.cloudRoleInstance],
                    cloudRoleName: envelope.tags[context.keys.cloudRole],
                    operationSynthetic: envelope.tags[context.keys.operationSyntheticSource],
                    requestSuccess: requestData.success,
                    requestResultCode: requestData.responseCode
                };
                AutoCollecPreAggregatedMetrics.countRequest(requestData.duration, requestDimensions);
                break;
            case TelemetryType.TelemetryTypeString.Dependency:
                const remoteDependencyData: Contracts.RemoteDependencyData = (envelope.data as any).baseData;
                remoteDependencyData.properties = {
                    ...remoteDependencyData.properties,
                    "_MS.ProcessedByMetricExtractors": "(Name:'Dependencies', Ver:'1.1')"
                }
                let dependencyDimensions: MetricDependencyDimensions = {
                    cloudRoleInstance: envelope.tags[context.keys.cloudRoleInstance],
                    cloudRoleName: envelope.tags[context.keys.cloudRole],
                    operationSynthetic: envelope.tags[context.keys.operationSyntheticSource],
                    dependencySuccess: remoteDependencyData.success,
                    dependencyType: remoteDependencyData.type,
                    dependencyTarget: remoteDependencyData.target,
                    dependencyResultCode: remoteDependencyData.resultCode
                };
                AutoCollecPreAggregatedMetrics.countDependency(remoteDependencyData.duration, dependencyDimensions);
                break;
        }
    }
    return true;
}
