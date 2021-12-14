import Contracts = require("../Declarations/Contracts");
import * as TelemetryType from "../Declarations/Contracts";
import {
    IMetricDependencyDimensions,
    IMetricExceptionDimensions,
    IMetricRequestDimensions,
    IMetricTraceDimensions
} from "../Declarations/Metrics/AggregatedMetricDimensions";
import { TelemetryClient } from "../applicationinsights";

export function preAggregatedMetricsTelemetryProcessor(envelope: Contracts.EnvelopeTelemetry, client: TelemetryClient): boolean {
    // Increment rate counters
    switch (envelope.data.baseType) {
        case TelemetryType.TelemetryTypeString.Exception:
            const exceptionData: Contracts.ExceptionData = (envelope.data as any).baseData;
            exceptionData.properties = {
                ...exceptionData.properties,
                "_MS.ProcessedByMetricExtractors": "(Name:'Exceptions', Ver:'1.1')"
            }
            let exceptionDimensions: IMetricExceptionDimensions = {
                cloudRoleInstance: envelope.tags[client.context.keys.cloudRoleInstance],
                cloudRoleName: envelope.tags[client.context.keys.cloudRole],
            };
            client.autoCollector.countPreAggregatedException(exceptionDimensions);
            break;
        case TelemetryType.TelemetryTypeString.Trace:
            const traceData: Contracts.TraceTelemetry = (envelope.data as any).baseData;
            traceData.properties = {
                ...traceData.properties,
                "_MS.ProcessedByMetricExtractors": "(Name:'Traces', Ver:'1.1')"
            }
            let traceDimensions: IMetricTraceDimensions = {
                cloudRoleInstance: envelope.tags[client.context.keys.cloudRoleInstance],
                cloudRoleName: envelope.tags[client.context.keys.cloudRole],
                traceSeverityLevel: Contracts.SeverityLevel[traceData.severity],
            };
            client.autoCollector.countPreAggregatedTrace(traceDimensions);
            break;
        case TelemetryType.TelemetryTypeString.Request:
            const requestData: Contracts.RequestData = (envelope.data as any).baseData;
            requestData.properties = {
                ...requestData.properties,
                "_MS.ProcessedByMetricExtractors": "(Name:'Requests', Ver:'1.1')"
            }
            let requestDimensions: IMetricRequestDimensions = {
                cloudRoleInstance: envelope.tags[client.context.keys.cloudRoleInstance],
                cloudRoleName: envelope.tags[client.context.keys.cloudRole],
                operationSynthetic: envelope.tags[client.context.keys.operationSyntheticSource],
                requestSuccess: requestData.success,
                requestResultCode: requestData.responseCode,
            };
            client.autoCollector.countPreAggregatedRequest(requestData.duration, requestDimensions);
            break;
        case TelemetryType.TelemetryTypeString.Dependency:
            const remoteDependencyData: Contracts.RemoteDependencyData = (envelope.data as any).baseData;
            remoteDependencyData.properties = {
                ...remoteDependencyData.properties,
                "_MS.ProcessedByMetricExtractors": "(Name:'Dependencies', Ver:'1.1')"
            }
            let dependencyDimensions: IMetricDependencyDimensions = {
                cloudRoleInstance: envelope.tags[client.context.keys.cloudRoleInstance],
                cloudRoleName: envelope.tags[client.context.keys.cloudRole],
                operationSynthetic: envelope.tags[client.context.keys.operationSyntheticSource],
                dependencySuccess: remoteDependencyData.success,
                dependencyType: remoteDependencyData.type,
                dependencyTarget: remoteDependencyData.target,
                dependencyResultCode: remoteDependencyData.resultCode,
            };
            client.autoCollector.countPreAggregatedDependency(remoteDependencyData.duration, dependencyDimensions);
            break;
    }
    return true;
}
