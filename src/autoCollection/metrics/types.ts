// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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