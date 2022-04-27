import {
  AzureMonitorTraceExporter,
  AzureExporterConfig,
} from "@azure/monitor-opentelemetry-exporter";
import { ExportResult } from "@opentelemetry/core";
import { ReadableSpan } from "@opentelemetry/sdk-trace-base";

import { Config } from "../configuration";

export class TraceExporter {
  public azureMonitorExporter: AzureMonitorTraceExporter;

  constructor(config: Config) {
    let ingestionEndpoint = config.endpointUrl.replace("/v2.1/track", "");
    let connectionString = `InstrumentationKey=${config.instrumentationKey};IngestionEndpoint=${ingestionEndpoint}`;
    let exporterConfig: AzureExporterConfig = {
      connectionString: connectionString,
      // TODO: Add AAD when published
    };
    this.azureMonitorExporter = new AzureMonitorTraceExporter(exporterConfig);
  }

  public async export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void) {
    try {
      return await this.azureMonitorExporter.export(spans, resultCallback);
    } catch (ex) {
      // Failed to export
    }
  }
}
