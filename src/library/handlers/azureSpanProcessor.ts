// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Context, SpanKind } from "@opentelemetry/api";
import { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { MetricHandler } from "./metricHandler";

export class AzureSpanProcessor implements SpanProcessor {

    constructor(private readonly _metricHandler: MetricHandler) { }

    forceFlush(): Promise<void> {
        return Promise.resolve();
    }

    onStart(span: Span, context: Context): void {
        if (this._metricHandler.isStandardMetricsEnabled) {
            if (span.instrumentationLibrary.name == "@opentelemetry/instrumentation-http") {
                if (span.kind === SpanKind.CLIENT) {
                    span.setAttributes({ "_MS.ProcessedByMetricExtractors": "(Name:'Dependencies', Ver:'1.1')" });
                }
                else if (span.kind === SpanKind.SERVER) {
                    span.setAttributes({ "_MS.ProcessedByMetricExtractors": "(Name:'Requests', Ver:'1.1')" });
                }
            }
        }
    }

    onEnd(span: ReadableSpan): void { }

    shutdown(): Promise<void> {
        return Promise.resolve();
    }
}
