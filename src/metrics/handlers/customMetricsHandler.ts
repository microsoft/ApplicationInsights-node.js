import { AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
import { Meter } from "@opentelemetry/api";
import {
    MeterProvider,
    MeterProviderOptions,
    PeriodicExportingMetricReader,
    PeriodicExportingMetricReaderOptions,
} from "@opentelemetry/sdk-metrics";
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { ApplicationInsightsConfig } from "../../shared";


export class CustomMetricsHandler {
    private _config: ApplicationInsightsConfig;
    private _collectionInterval = 60000; // 60 seconds
    private _meterProvider: MeterProvider;
    private _azureMonitorExporter: AzureMonitorMetricExporter;
    private _otlpExporter: OTLPMetricExporter;
    private _meter: Meter;

    constructor(config: ApplicationInsightsConfig, options?: { collectionInterval: number }) {
        this._config = config;
        const meterProviderConfig: MeterProviderOptions = {
            resource: this._config.resource,
        };
        this._meterProvider = new MeterProvider(meterProviderConfig);
        this._azureMonitorExporter = new AzureMonitorMetricExporter(this._config.azureMonitorExporterConfig);
        const metricReaderOptions: PeriodicExportingMetricReaderOptions = {
            exporter: this._azureMonitorExporter,
            exportIntervalMillis: options?.collectionInterval || this._collectionInterval,
        };
        const azureMonitorMetricReader = new PeriodicExportingMetricReader(metricReaderOptions);
        this._meterProvider.addMetricReader(azureMonitorMetricReader);

        if (config.otlpMetricExporterConfig?.enabled) {
            this._otlpExporter = new OTLPMetricExporter(config.otlpMetricExporterConfig.baseConfig);
            const otlpMetricReader = new PeriodicExportingMetricReader({
                exporter: this._otlpExporter,
                exportIntervalMillis: options?.collectionInterval || this._collectionInterval,
            });
            this._meterProvider.addMetricReader(otlpMetricReader);
        }
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
