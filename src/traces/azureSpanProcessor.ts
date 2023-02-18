// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Context } from "@opentelemetry/api";
import { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { MetricHandler } from "../metrics/metricHandler";


export class AzureSpanProcessor implements SpanProcessor {
    constructor(private readonly _metricHandler: MetricHandler) { }

    forceFlush(): Promise<void> {
        return Promise.resolve();
    }

    onStart(span: Span, context: Context): void {
        this._metricHandler.markSpanAsProcceseded(span);
    }

    onEnd(span: ReadableSpan): void {
        // Record duration metrics
        this._metricHandler.recordSpan(span);
        // Calculate exception and log metrics
        this._metricHandler.recordSpanEvents(span);
    }

    shutdown(): Promise<void> {
        return Promise.resolve();
    }
}
