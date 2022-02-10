import { AzureMonitorTraceExporter, AzureExporterConfig } from "@azure/monitor-opentelemetry-exporter";
import { ExportResult } from "@opentelemetry/core";
import { ReadableSpan } from "@opentelemetry/sdk-trace-base";


export class TraceExporter {
    private _exporter: AzureMonitorTraceExporter;


    constructor(connectionString: string) {
        let config: AzureExporterConfig = {
            connectionString: connectionString
        };
        this._exporter = new AzureMonitorTraceExporter();
    }

    public async export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void) {
        try {
            return await this._exporter.export(spans, resultCallback);
        }
        catch (ex) {
            // Failed to export
        }
    }
}
