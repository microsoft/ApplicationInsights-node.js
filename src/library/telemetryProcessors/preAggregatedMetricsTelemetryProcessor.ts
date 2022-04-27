import * as TelemetryType from "../../declarations/contracts";
import {
  IMetricDependencyDimensions,
  IMetricExceptionDimensions,
  IMetricRequestDimensions,
  IMetricTraceDimensions,
} from "../../declarations/metrics/aggregatedMetricDimensions";
import { TelemetryClient } from "../../library";
import { KnownContextTagKeys, TelemetryItem as Envelope } from "../../declarations/generated";

export function preAggregatedMetricsTelemetryProcessor(
  envelope: Envelope,
  client: TelemetryClient
): boolean {
  // Increment rate counters
  switch (envelope.data.baseType) {
    case TelemetryType.TelemetryTypeString.Exception:
      const exceptionData = (envelope.data as any).baseData;
      exceptionData.properties = {
        ...exceptionData.properties,
        "_MS.ProcessedByMetricExtractors": "(Name:'Exceptions', Ver:'1.1')",
      };
      let exceptionDimensions: IMetricExceptionDimensions = {
        cloudRoleInstance: envelope.tags[KnownContextTagKeys.AiCloudRoleInstance],
        cloudRoleName: envelope.tags[KnownContextTagKeys.AiCloudRole],
      };
      client.metricHandler.countPreAggregatedException(exceptionDimensions);
      break;
    case TelemetryType.TelemetryTypeString.Trace:
      const traceData = (envelope.data as any).baseData;
      traceData.properties = {
        ...traceData.properties,
        "_MS.ProcessedByMetricExtractors": "(Name:'Traces', Ver:'1.1')",
      };
      let traceDimensions: IMetricTraceDimensions = {
        cloudRoleInstance: envelope.tags[KnownContextTagKeys.AiCloudRoleInstance],
        cloudRoleName: envelope.tags[KnownContextTagKeys.AiCloudRole],
        traceSeverityLevel: traceData.severity,
      };
      client.metricHandler.countPreAggregatedTrace(traceDimensions);
      break;
    case TelemetryType.TelemetryTypeString.Request:
      const requestData = (envelope.data as any).baseData;
      requestData.properties = {
        ...requestData.properties,
        "_MS.ProcessedByMetricExtractors": "(Name:'Requests', Ver:'1.1')",
      };
      let requestDimensions: IMetricRequestDimensions = {
        cloudRoleInstance: envelope.tags[KnownContextTagKeys.AiCloudRoleInstance],
        cloudRoleName: envelope.tags[KnownContextTagKeys.AiCloudRole],
        operationSynthetic: envelope.tags[KnownContextTagKeys.AiOperationSyntheticSource],
        requestSuccess: requestData.success,
        requestResultCode: requestData.responseCode,
      };
      client.metricHandler.countPreAggregatedRequest(requestData.duration, requestDimensions);
      break;
    case TelemetryType.TelemetryTypeString.Dependency:
      const remoteDependencyData = (envelope.data as any).baseData;
      remoteDependencyData.properties = {
        ...remoteDependencyData.properties,
        "_MS.ProcessedByMetricExtractors": "(Name:'Dependencies', Ver:'1.1')",
      };
      let dependencyDimensions: IMetricDependencyDimensions = {
        cloudRoleInstance: envelope.tags[KnownContextTagKeys.AiCloudRoleInstance],
        cloudRoleName: envelope.tags[KnownContextTagKeys.AiCloudRole],
        operationSynthetic: envelope.tags[KnownContextTagKeys.AiOperationSyntheticSource],
        dependencySuccess: remoteDependencyData.success,
        dependencyType: remoteDependencyData.type,
        dependencyTarget: remoteDependencyData.target,
        dependencyResultCode: remoteDependencyData.resultCode,
      };
      client.metricHandler.countPreAggregatedDependency(
        remoteDependencyData.duration,
        dependencyDimensions
      );
      break;
  }
  return true;
}
