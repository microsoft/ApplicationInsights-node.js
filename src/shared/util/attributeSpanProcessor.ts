import { SpanProcessor, Span } from "@opentelemetry/sdk-trace-base";

export class AttributeSpanProcessor implements SpanProcessor {
    private _attributes: { [key: string]: string };
    constructor(attributes: { [key: string]: string }) {
        this._attributes = attributes;
    }
    
    // Implement onStart to apply span attributes before exporting
    onStart(span: Span): void {
        span.setAttributes(this._attributes);
    }

    onEnd(): void {
        return;
    }

    shutdown(): Promise<void> {
        return Promise.resolve();
    }

    forceFlush(): Promise<void> {
        return Promise.resolve();
    }
}
