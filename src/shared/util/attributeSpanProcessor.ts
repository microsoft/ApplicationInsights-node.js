import { BatchSpanProcessor, Span } from "@opentelemetry/sdk-trace-base";
import { SpanExporter } from "@opentelemetry/sdk-trace-node";
import { context } from "@opentelemetry/api";

export class AttributeSpanProcessor extends BatchSpanProcessor {
    private _attributes: { [key: string]: string };
    constructor(exporter: SpanExporter, attributes: { [key: string]: string }) {
        super(exporter);
        this._attributes = attributes;
    }
    // Override onStart to apply span attributes before exporting
    onStart(span: Span) {
        span.setAttributes(this._attributes);
        super.onStart(span, context.active());
    }
}
