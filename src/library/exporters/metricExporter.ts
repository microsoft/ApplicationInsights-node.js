// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ExportResult } from "@opentelemetry/core";
import { AzureExporterConfig } from "@azure/monitor-opentelemetry-exporter";



import { BaseExporter } from "./shared";
import { Config } from "../configuration";
import { Logger } from "../logging"

export class MetricExporter extends BaseExporter {

    constructor(config: Config) {
        let ingestionEndpoint = config.endpointUrl.replace("/v2.1/track", "");
        let connectionString = `InstrumentationKey=${config.instrumentationKey};IngestionEndpoint=${ingestionEndpoint}`;
        let exporterConfig: AzureExporterConfig = {
            connectionString: connectionString,
        };
        super(exporterConfig);
    }

    /**
     * Shutdown AzureMonitorTraceExporter.
     */
    public async shutdown(): Promise<void> {
        Logger.getInstance().info("Azure Monitor Metrics Exporter shutting down");
        return this._sender.shutdown();
    }
}
