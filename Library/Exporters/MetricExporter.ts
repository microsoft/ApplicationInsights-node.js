// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ExportResult } from "@opentelemetry/core";
import { TelemetryItem as Envelope } from "../../Declarations/Generated";
import { BaseExporter } from "./Shared/BaseExporter";
import { Config } from "../Configuration/Config";

export class MetricExporter extends BaseExporter {

    constructor(config: Config) {
        super();
    }

    /**
     * Export Metric telemetry.
     * @param spans - Spans to export.
     * @param resultCallback - Result callback.
     */
    public async export(envelopes: Envelope[], resultCallback: (result: ExportResult) => void): Promise<void> {
        resultCallback(await this.exportEnvelopes(envelopes));
    }
}
