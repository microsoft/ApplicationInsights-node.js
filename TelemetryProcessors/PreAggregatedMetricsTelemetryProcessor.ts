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
    // Increment rate counters
    switch (envelope.data.baseType) {
        case TelemetryType.TelemetryTypeString.Exception:
            let exceptionDimensions: MetricExceptionDimensions = {
                cloudRoleInstance: envelope.tags[context.keys.cloudRoleInstance],
                cloudRoleName: envelope.tags[context.keys.cloudRole],
            };
            AutoCollecPreAggregatedMetrics.countException(exceptionDimensions);
            break;
        case TelemetryType.TelemetryTypeString.Trace:
            let traceDimensions: MetricTraceDimensions = {
                cloudRoleInstance: envelope.tags[context.keys.cloudRoleInstance],
                cloudRoleName: envelope.tags[context.keys.cloudRole],
            };
            AutoCollecPreAggregatedMetrics.countTrace(traceDimensions);
            break;
        case TelemetryType.TelemetryTypeString.Request:
            const requestData: Contracts.RequestData = (envelope.data as any).baseData;
            let requestDimensions: MetricRequestDimensions = {
                cloudRoleInstance: envelope.tags[context.keys.cloudRoleInstance],
                cloudRoleName: envelope.tags[context.keys.cloudRole],
                duration: requestData.duration,
                success: requestData.success,
                resultCode: requestData.responseCode,
            };
            AutoCollecPreAggregatedMetrics.countRequest(requestDimensions);
            break;
        case TelemetryType.TelemetryTypeString.Dependency:
            const remoteDependencyData: Contracts.RemoteDependencyData = (envelope.data as any).baseData;
            let dependencyDimensions: MetricDependencyDimensions = {
                cloudRoleInstance: envelope.tags[context.keys.cloudRoleInstance],
                cloudRoleName: envelope.tags[context.keys.cloudRole],
                duration: remoteDependencyData.duration,
                success: remoteDependencyData.success,
                type: remoteDependencyData.type,
                target: remoteDependencyData.target,
                resultCode: remoteDependencyData.resultCode,
            };
            AutoCollecPreAggregatedMetrics.countDependency(dependencyDimensions);
            break;
    }
    return true;
}
