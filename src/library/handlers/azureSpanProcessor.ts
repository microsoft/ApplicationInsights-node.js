// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Context, SpanKind } from "@opentelemetry/api";
import { ReadableSpan, Span, SpanProcessor, TimedEvent } from "@opentelemetry/sdk-trace-base";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { IStandardMetricBaseDimensions } from "../../autoCollection/metrics/types";
import { MetricHandler } from "./metricHandler";

export class AzureSpanProcessor implements SpanProcessor {
    constructor(private readonly _metricHandler: MetricHandler) {}

    forceFlush(): Promise<void> {
        return Promise.resolve();
    }

    onStart(span: Span, context: Context): void {
        if (this._metricHandler.getConfig().enableAutoCollectStandardMetrics) {
            if (span.instrumentationLibrary.name == "@opentelemetry/instrumentation-http") {
                if (span.kind === SpanKind.CLIENT) {
                    span.setAttributes({
                        "_MS.ProcessedByMetricExtractors": "(Name:'Dependencies', Ver:'1.1')",
                    });
                } else if (span.kind === SpanKind.SERVER) {
                    span.setAttributes({
                        "_MS.ProcessedByMetricExtractors": "(Name:'Requests', Ver:'1.1')",
                    });
                }
            }
        }
    }

    onEnd(span: ReadableSpan): void {
        if (span.events) {
            span.events.forEach((event: TimedEvent) => {
                let dimensions: IStandardMetricBaseDimensions = {
                    cloudRoleInstance: "",
                    cloudRoleName: "",
                };
                const serviceName =
                    span.resource?.attributes[SemanticResourceAttributes.SERVICE_NAME];
                const serviceNamespace =
                    span.resource?.attributes[SemanticResourceAttributes.SERVICE_NAMESPACE];
                if (serviceName) {
                    if (serviceNamespace) {
                        dimensions.cloudRoleInstance = `${serviceNamespace}.${serviceName}`;
                    } else {
                        dimensions.cloudRoleName = String(serviceName);
                    }
                }
                if (event.name == "exception") {
                    this._metricHandler.countException(dimensions);
                } else {
                    this._metricHandler.countTrace(dimensions);
                }
            });
        }
    }

    shutdown(): Promise<void> {
        return Promise.resolve();
    }
}
