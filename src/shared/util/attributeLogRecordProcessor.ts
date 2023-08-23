import { BatchLogRecordProcessor, LogRecord, LogRecordExporter } from "@opentelemetry/sdk-logs";

export class AttributeLogProcessor extends BatchLogRecordProcessor {
    private _attributes: { [key: string]: string };
    constructor(exporter: LogRecordExporter, attributes: { [key: string]: string }) {
        super(exporter);
        this._attributes = attributes;
    }
    // Override onEmit to apply log record attributes before exporting
    onEmit(record: LogRecord) {
        record.setAttributes(this._attributes);
        super.onEmit(record);
    }
}
