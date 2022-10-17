// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IncomingMessage, RequestOptions } from "http";

import { SpanKind } from "@opentelemetry/api";
import { MetricAttributes, ValueType } from "@opentelemetry/api-metrics";
import { InstrumentationConfig } from "@opentelemetry/instrumentation";


export enum MetricName {
  // Memory
  PRIVATE_BYTES = "PRIVATE_BYTES",
  AVAILABLE_BYTES = "AVAILABLE_BYTES",
  COMMITTED_BYTES = "COMMITTED_BYTES",
  // CPU
  PROCESSOR_TIME = "PROCESSOR_TIME",
  PROCESS_TIME = "PROCESS_TIME",
  // Requests
  REQUEST_RATE = "REQUEST_RATE",
  REQUEST_FAILURE_RATE = "REQUEST_FAILURE_RATE",
  REQUEST_DURATION = "REQUEST_DURATION",
  DEPENDENCY_RATE = "DEPENDENCY_RATE",
  DEPENDENCY_FAILURE_RATE = "DEPENDENCY_FAILURE_RATE",
  DEPENDENCY_DURATION = "DEPENDENCY_DURATION",
  // Exceptions
  EXCEPTION_RATE = "EXCEPTION_RATE",
  EXCEPTION_COUNT = "EXCEPTION_COUNT",
  // Traces
  TRACE_RATE = "TRACE_RATE",
  TRACE_COUNT = "TRACE_COUNT",
}

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

export enum StandardMetric {
  REQUEST_DURATION = "azureMonitor.standardMetric.requestDuration",
  DEPENDENCY_DURATION = "azureMonitor.standardMetric.dependencyDuration",
  EXCEPTION_COUNT = "azureMonitor.standardMetric.exceptionCount",
  TRACE_COUNT = "azureMonitor.standardMetric.traceCount",
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

export enum GarbageCollectionType {
  Scavenge = "Scavenge",
  MarkSweepCompact = "MarkSweepCompact",
  IncrementalMarking = "IncrementalMarking"
}

export class AggregatedMetric {
  public name: string;
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
  public dimensions: IStandardMetricBaseDimensions;

  constructor(dimensions: IStandardMetricBaseDimensions) {
    this.dimensions = dimensions;
    this.totalCount = 0;
    this.lastTotalCount = 0;
    this.intervalExecutionTime = 0;
    this.lastTime = +new Date();
    this.lastIntervalExecutionTime = 0;
  }
}

export interface IStandardMetricBaseDimensions {
  cloudRoleInstance?: string;
  cloudRoleName?: string;
}

export interface IMetricExceptionDimensions extends IStandardMetricBaseDimensions { }

export interface IMetricTraceDimensions extends IStandardMetricBaseDimensions {
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

export interface IHttpStandardMetric {
  startTime: number;
  isProcessed: boolean;
  spanKind: SpanKind
  attributes: MetricAttributes;
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

export type IgnoreMatcher = string | RegExp | ((url: string) => boolean);

export interface IgnoreIncomingRequestFunction {
  (request: IncomingMessage): boolean;
}

export interface IgnoreOutgoingRequestFunction {
  (request: RequestOptions): boolean;
}

export interface HttpMetricsInstrumentationConfig extends InstrumentationConfig {
  /** Not trace all incoming requests that matched with custom function */
  ignoreIncomingRequestHook?: IgnoreIncomingRequestFunction;
  /** Not trace all outgoing requests that matched with custom function */
  ignoreOutgoingRequestHook?: IgnoreOutgoingRequestFunction;
}
