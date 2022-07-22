// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum PerformanceCounter {
  // Memory
  PRIVATE_BYTES = "\\Process(??APP_WIN32_PROC??)\\Private Bytes",
  AVAILABLE_BYTES = "\\Memory\\Available Bytes",
  // CPU
  PROCESSOR_TIME = "\\Processor(_Total)\\% Processor Time",
  PROCESS_TIME = "\\Process(??APP_WIN32_PROC??)\\% Processor Time",
  // Requests
  REQUEST_RATE = "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Requests/Sec",
  REQUEST_DURATION = "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Request Execution Time",
}

export enum StandardMetric {
  REQUESTS = "Server response time",
  DEPENDENCIES = "Dependency duration",
  EXCEPTIONS = "Exceptions",
  TRACES = "Traces",
}

export enum NativeMetricsCounter {
  HEAP_MEMORY_USAGE = "Memory Usage (Heap)",
  HEAP_MEMORY_TOTAL = "Memory Total (Heap)",
  MEMORY_USAGE_NON_HEAP = "Memory Usage (Non-Heap)",
  EVENT_LOOP_CPU = "Event Loop CPU Time",
  GARBAGE_COLLECTION_SCAVENGE = "Scavenge Garbage Collection Duration",
  GARBAGE_COLLECTION_SWEEP_COMPACT = "MarkSweepCompact Garbage Collection Duration",
  GARBAGE_COLLECTION_INCREMENTAL_MARKING = "IncrementalMarking Collection Duration",
}

export enum QuickPulseCounter {
  // Memory
  COMMITTED_BYTES = "\\Memory\\Committed Bytes",
  // CPU
  PROCESSOR_TIME = "\\Processor(_Total)\\% Processor Time",
  // Request
  REQUEST_RATE = "\\ApplicationInsights\\Requests/Sec",
  REQUEST_FAILURE_RATE = "\\ApplicationInsights\\Requests Failed/Sec",
  REQUEST_DURATION = "\\ApplicationInsights\\Request Duration",
  // Dependency
  DEPENDENCY_RATE = "\\ApplicationInsights\\Dependency Calls/Sec",
  DEPENDENCY_FAILURE_RATE = "\\ApplicationInsights\\Dependency Calls Failed/Sec",
  DEPENDENCY_DURATION = "\\ApplicationInsights\\Dependency Call Duration",
  // Exception
  EXCEPTION_RATE = "\\ApplicationInsights\\Exceptions/Sec",
}

export enum GarbageCollectionType {
  Scavenge = "Scavenge",
  MarkSweepCompact = "MarkSweepCompact",
  IncrementalMarking = "IncrementalMarking"
}

export enum MetricId {
  REQUESTS_DURATION = "requests/duration",
  DEPENDENCIES_DURATION = "dependencies/duration",
  EXCEPTIONS_COUNT = "exceptions/count",
  TRACES_COUNT = "traces/count",
}

export class AggregatedMetric {
  public name: string;
  public metricType: MetricId;
  public dimensions: { [key: string]: any };
  public value: number;
  public count: number;
  public aggregationInterval: number;
}

export class AggregatedMetricCounter {
  public time: number;
  public lastTime: number;
  public totalCount: number;
  public lastTotalCount: number;
  public intervalExecutionTime: number;
  public lastIntervalExecutionTime: number;
  public dimensions: IMetricBaseDimensions;

  constructor(dimensions: IMetricBaseDimensions) {
    this.dimensions = dimensions;
    this.totalCount = 0;
    this.lastTotalCount = 0;
    this.intervalExecutionTime = 0;
    this.lastTime = +new Date();
    this.lastIntervalExecutionTime = 0;
  }
}

export interface IMetricBaseDimensions {
  cloudRoleInstance?: string;
  cloudRoleName?: string;
}

export interface IMetricDependencyDimensions extends IMetricBaseDimensions {
  dependencyType?: string;
  dependencyTarget?: string;
  dependencySuccess?: boolean;
  dependencyResultCode?: string;
  operationSynthetic?: string;
}

export interface IMetricRequestDimensions extends IMetricBaseDimensions {
  requestSuccess?: boolean;
  requestResultCode?: string;
  operationSynthetic?: string;
}

export interface IMetricExceptionDimensions extends IMetricBaseDimensions { }

export interface IMetricTraceDimensions extends IMetricBaseDimensions {
  traceSeverityLevel?: string;
}

export type MetricDimensionTypeKeys =
  | "cloudRoleInstance"
  | "cloudRoleName"
  | "requestSuccess"
  | "requestResultCode"
  | "dependencyType"
  | "dependencyTarget"
  | "dependencySuccess"
  | "dependencyResultCode"
  | "traceSeverityLevel"
  | "operationSynthetic";

export interface IHttpMetric {
  startTime: number;
  isOutgoingRequest: boolean;
  isProcessed: boolean;
  dimensions?: IMetricDependencyDimensions | IMetricRequestDimensions;
}

// Names expected in Breeze side for dimensions
export const PreAggregatedMetricPropertyNames: { [key in MetricDimensionTypeKeys]: string } = {
  cloudRoleInstance: "cloud/roleInstance",
  cloudRoleName: "cloud/roleName",
  operationSynthetic: "operation/synthetic",
  requestSuccess: "Request.Success",
  requestResultCode: "request/resultCode",
  dependencyType: "Dependency.Type",
  dependencyTarget: "dependency/target",
  dependencySuccess: "Dependency.Success",
  dependencyResultCode: "dependency/resultCode",
  traceSeverityLevel: "trace/severityLevel",
}
