import {
    AzureMonitorExporterOptions,
    AzureMonitorMetricExporter,
} from "@azure/monitor-opentelemetry-exporter";
import { Meter } from "@opentelemetry/api";
import {
    DropAggregation,
    MeterProvider,
    MeterProviderOptions,
    PeriodicExportingMetricReader,
    PeriodicExportingMetricReaderOptions,
    View,
} from "@opentelemetry/sdk-metrics";
import { ApplicationInsightsConfig } from "../../shared";
import { ExceptionMetrics } from "../collection/exceptionMetrics";
import { TraceMetrics } from "../collection/traceMetrics";
import { MetricName, StandardMetric } from "../types";

export class StandardMetricsHandler {
    private _config: ApplicationInsightsConfig;
    private _collectionInterval = 60000; // 60 seconds
    private _meterProvider: MeterProvider;
    private _azureExporter: AzureMonitorMetricExporter;
    private _metricReader: PeriodicExportingMetricReader;
    private _meter: Meter;
    private _exceptionMetrics: ExceptionMetrics;
    private _traceMetrics: TraceMetrics;

    constructor(config: ApplicationInsightsConfig, options?: { collectionInterval: number }) {
        this._config = config;
        const meterProviderConfig: MeterProviderOptions = {
            resource: this._config.resource,
            views: this._getViews(),
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
        this._meter = this._meterProvider.getMeter("ApplicationInsightsStandardMetricsMeter");
        this._exceptionMetrics = new ExceptionMetrics(this._meter);
        this._traceMetrics = new TraceMetrics(this._meter);
    }

    public shutdown() {
        this._meterProvider.shutdown();
    }

    public getMeterProvider(): MeterProvider {
        return this._meterProvider;
    }

    public getExceptionMetrics(): ExceptionMetrics {
        return this._exceptionMetrics;
    }

    public getTraceMetrics(): TraceMetrics {
        return this._traceMetrics;
    }

    private _getViews(): View[] {
        const views = [];
        views.push(
            new View({
                name: StandardMetric.HTTP_REQUEST_DURATION,
                instrumentName: "http.server.duration", // Metric semantic conventions not available yet
            })
        );
        views.push(
            new View({
                name: StandardMetric.HTTP_DEPENDENCY_DURATION,
                instrumentName: "http.client.duration", // Metric semantic conventions not available yet
            })
        );
        views.push(
            new View({
                name: StandardMetric.EXCEPTION_COUNT,
                instrumentName: MetricName.EXCEPTION_COUNT,
            })
        );
        views.push(
            new View({
                name: StandardMetric.TRACE_COUNT,
                instrumentName: MetricName.TRACE_COUNT,
            })
        );
        // Ignore list
        views.push(
            new View({
                instrumentName: MetricName.EXCEPTION_RATE,
                aggregation: new DropAggregation(),
            })
        );
        views.push(
            new View({
                instrumentName: MetricName.TRACE_RATE,
                aggregation: new DropAggregation(),
            })
        );
        return views;
    }

    public async flush(): Promise<void> {
        await this._meterProvider.forceFlush();
    }
}
