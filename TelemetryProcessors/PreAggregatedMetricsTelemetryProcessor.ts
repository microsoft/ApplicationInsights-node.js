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
                requestSuccess: requestData.success,
                requestResultCode: requestData.responseCode,
            };
            AutoCollecPreAggregatedMetrics.countRequest(requestData.duration, requestDimensions);
            break;
        case TelemetryType.TelemetryTypeString.Dependency:
            const remoteDependencyData: Contracts.RemoteDependencyData = (envelope.data as any).baseData;
            let dependencyDimensions: MetricDependencyDimensions = {
                cloudRoleInstance: envelope.tags[context.keys.cloudRoleInstance],
                cloudRoleName: envelope.tags[context.keys.cloudRole],
                dependencySuccess: remoteDependencyData.success,
                dependencyType: remoteDependencyData.type,
                dependencyTarget: remoteDependencyData.target,
                dependencyResultCode: remoteDependencyData.resultCode,
            };
            AutoCollecPreAggregatedMetrics.countDependency(remoteDependencyData.duration, dependencyDimensions);
            break;
    }
    return true;
}
