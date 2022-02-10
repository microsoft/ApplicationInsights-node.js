import { ExportResult } from "@opentelemetry/core";
import { TelemetryItem as Envelope } from "../../Declarations/Generated";
import { BaseExporter } from "./Shared/BaseExporter";


export class MetricExporter extends BaseExporter {

    /**
     * Export Metric telemetry.
     * @param spans - Spans to export.
     * @param resultCallback - Result callback.
     */
    public async export(envelopes: Envelope[], resultCallback: (result: ExportResult) => void): Promise<void> {
        resultCallback(await this.exportEnvelopes(envelopes));
    }
}
