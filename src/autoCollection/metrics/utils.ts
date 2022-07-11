import { AzureExporterConfig, AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
import {
    MeterProvider,
    MeterProviderOptions,
    PeriodicExportingMetricReader,
    PeriodicExportingMetricReaderOptions,
} from "@opentelemetry/sdk-metrics-base";
import { Config } from "../../library";


export function createMeterProvider(config: Config, providerOptions?: MeterProviderOptions, exportIntervalMillis: number = 60000): MeterProvider {
    let meterProvider = new MeterProvider();
    let exporterConfig: AzureExporterConfig = {
        connectionString: config.getConnectionString(),
        aadTokenCredential: config.aadTokenCredential
    };
    let exporter = new AzureMonitorMetricExporter(exporterConfig);
    const metricReaderOptions: PeriodicExportingMetricReaderOptions = {
        exporter: exporter,
        exportIntervalMillis: exportIntervalMillis
    };
    let metricReader = new PeriodicExportingMetricReader(metricReaderOptions);
    meterProvider.addMetricReader(metricReader);
    return meterProvider;
}
