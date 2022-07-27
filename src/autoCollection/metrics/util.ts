// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MetricAttributes } from "@opentelemetry/api-metrics";
import { IMetricBaseDimensions } from "./types";

export function getMetricAttributes(dimensions: IMetricBaseDimensions): MetricAttributes {
  let attributes: MetricAttributes = {};
  
  return attributes;
}