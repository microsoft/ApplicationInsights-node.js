// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { diag } from "@opentelemetry/api";
import { ExportResult } from "@opentelemetry/core";
import { MetricExporter, MetricRecord } from "@opentelemetry/sdk-metrics-base";
import { AzureExporterConfig } from "@azure/monitor-opentelemetry-exporter";

import { TelemetryItem as Envelope, MetricsData, MetricDataPoint } from "../../Declarations/Generated";
import { BaseExporter } from "./Shared/BaseExporter";
import { Config } from "../Configuration/Config";


export class AzureMonitorMetricExporter extends BaseExporter implements MetricExporter {

    constructor(config: Config) {
        let ingestionEndpoint = config.endpointUrl.replace("/v2.1/track", "");
        let connectionString = `InstrumentationKey=${config.instrumentationKey};IngestionEndpoint=${ingestionEndpoint}`;
        let exporterConfig: AzureExporterConfig = {
            connectionString: connectionString
        };
        super(exporterConfig);
    }

    /** Exports the list of a given {@link MetricRecord} */
    public async export(metrics: MetricRecord[], resultCallback: (result: ExportResult) => void): Promise<void> {
        diag.info(`Exporting ${metrics.length} metric(s). Converting to envelopes...`);
        const envelopes = metrics.map((metric) =>
            this._metricToEnvelope(metric, this._options.instrumentationKey)
        );
        resultCallback(await this.exportEnvelopes(envelopes));
    }

    /**
     * Shutdown AzureMonitorTraceExporter.
     */
    async shutdown(): Promise<void> {
        diag.info("Azure Monitor Metrics Exporter shutting down");
        return this._sender.shutdown();
    }

    /**
     * Metric to Azure envelope parsing.
     * @internal
     */
    private _metricToEnvelope(metric: MetricRecord, ikey: string): Envelope {
        let name: string;
        let baseType: "RemoteDependencyData" | "RequestData";
        const sampleRate = 100;
        let baseData: MetricsData;



        return null;
    }
}
