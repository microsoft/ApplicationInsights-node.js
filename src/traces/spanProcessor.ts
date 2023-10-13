// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Context } from "@opentelemetry/api";
import { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { PerformanceCounterMetrics } from "../metrics/performanceCounters";

/**
 * Azure Monitor Span Processor.
 * @internal
 */
export class AzureMonitorSpanProcessor implements SpanProcessor {
  private readonly _metricHandler: PerformanceCounterMetrics;

  constructor(metricHandler: PerformanceCounterMetrics) {
    this._metricHandler = metricHandler;
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  onStart(span: Span, _context: Context): void {
    
  }

  onEnd(span: ReadableSpan): void {
    this._metricHandler.recordSpan(span);
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
