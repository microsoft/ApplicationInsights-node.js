// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Context, SpanKind, TraceFlags } from "@opentelemetry/api";
import { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";

/**
 * Azure Monitor Incoming & Outgoing Request Processor.
 * @internal
 */
export class RequestSpanProcessor implements SpanProcessor {
    private _enableDependencyTelemetry: boolean;
    private _enableRequestTelemetry: boolean;

    constructor(enableDependencyTelemetry: boolean, enableRequestTelemetry: boolean) {
        this._enableDependencyTelemetry = enableDependencyTelemetry;
        this._enableRequestTelemetry = enableRequestTelemetry;
    }

    forceFlush(): Promise<void> {
        return Promise.resolve();
    }

    onStart(span: Span, _context: Context): void {
        return;
    }

    onEnd(span: ReadableSpan): void {
        if (this._enableDependencyTelemetry === false) {
            if (span.kind === SpanKind.CLIENT || span.kind === SpanKind.PRODUCER) {
                span.spanContext().traceFlags = TraceFlags.SAMPLED;
            }
        }
        if (this._enableRequestTelemetry === false) {
            if (span.kind === SpanKind.SERVER || span.kind === SpanKind.CONSUMER) {
                span.spanContext().traceFlags = TraceFlags.SAMPLED;
            }
        }
    }

    shutdown(): Promise<void> {
        return Promise.resolve();
    }
}