import { LogRecord, LogRecordProcessor } from "@opentelemetry/sdk-logs";

export class AttributeLogProcessor implements LogRecordProcessor {
    private _attributes: { [key: string]: string };
    constructor(attributes: { [key: string]: string }) {
        this._attributes = attributes;
    }
    
    // Override onEmit to apply log record attributes before exporting
    onEmit(record: LogRecord) {
        record.setAttributes(this._attributes);
    }

    shutdown(): Promise<void> {
        return Promise.resolve();
    }

    forceFlush(): Promise<void> {
        return Promise.resolve();
    }
}
