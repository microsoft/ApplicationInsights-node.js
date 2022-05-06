// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { diag } from "@opentelemetry/api";
import { AzureExporterConfig } from "@azure/monitor-opentelemetry-exporter";
import { BaseExporter, parseStack } from "./shared";
import { Config } from "../configuration";


export class LogExporter extends BaseExporter {

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
    async shutdown(): Promise<void> {
        diag.info("Azure Monitor Logs Exporter shutting down");
        return this._sender.shutdown();
    }
}
