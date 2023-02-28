import {
    AzureMonitorExporterOptions,
    AzureMonitorMetricExporter,
} from "@azure/monitor-opentelemetry-exporter";
import { Meter } from "@opentelemetry/api";
import {
    MeterProvider,
    MeterProviderOptions,
    PeriodicExportingMetricReader,
    PeriodicExportingMetricReaderOptions,
} from "@opentelemetry/sdk-metrics";
import { ApplicationInsightsConfig } from "../../shared";

export class CustomMetricsHandler {
    private _config: ApplicationInsightsConfig;
    private _collectionInterval = 60000; // 60 seconds
    private _meterProvider: MeterProvider;
    private _azureExporter: AzureMonitorMetricExporter;
    private _metricReader: PeriodicExportingMetricReader;
    private _meter: Meter;

    constructor(config: ApplicationInsightsConfig, options?: { collectionInterval: number }) {
        this._config = config;
        const meterProviderConfig: MeterProviderOptions = {
            resource: this._config.resource,
        };
        this._meterProvider = new MeterProvider(meterProviderConfig);
        const exporterConfig: AzureMonitorExporterOptions = {
            connectionString: this._config.connectionString,
            aadTokenCredential: this._config.aadTokenCredential,
            storageDirectory: this._config.storageDirectory,
            disableOfflineStorage: this._config.disableOfflineStorage,
        };
        this._azureExporter = new AzureMonitorMetricExporter(exporterConfig);
        const metricReaderOptions: PeriodicExportingMetricReaderOptions = {
            exporter: this._azureExporter as any,
            exportIntervalMillis: options?.collectionInterval || this._collectionInterval,
        };
        this._metricReader = new PeriodicExportingMetricReader(metricReaderOptions);
        this._meterProvider.addMetricReader(this._metricReader);
        this._meter = this._meterProvider.getMeter("ApplicationInsightsCustomMetricsMeter");
    }

    public shutdown() {
        this._meterProvider.shutdown();
    }

    public getMeter(): Meter {
        return this._meter;
    }

    public async flush(): Promise<void> {
        await this._meterProvider.forceFlush();
    }
}
