import { AzureExporterConfig, AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
import { Meter } from "@opentelemetry/api-metrics";
import { MeterProvider, MeterProviderOptions, PeriodicExportingMetricReader, PeriodicExportingMetricReaderOptions } from "@opentelemetry/sdk-metrics-base";
import { RequestOptions } from "https";
import { Config } from "../../../library";
import { MetricExporter } from "../../../library/exporters";
import { ResourceManager } from "../../../library/handlers";
import { BatchProcessor } from "../../../library/handlers/shared/batchProcessor";
import { ExceptionMetrics } from "../exceptionMetrics";
import { HttpMetricsInstrumentation } from "../httpMetricsInstrumentation";
import { TraceMetrics } from "../traceMetrics";
import { HttpMetricsInstrumentationConfig } from "../types";


export class StandardMetricsHandler {

    private _config: Config;
    private _collectionInterval: number = 600000;
    private _meterProvider: MeterProvider;
    private _azureExporter: AzureMonitorMetricExporter;
    private _metricReader: PeriodicExportingMetricReader;
    private _meter: Meter;
    private _exceptionMetrics: ExceptionMetrics;
    private _httpMetrics: HttpMetricsInstrumentation;
    private _traceMetrics: TraceMetrics;

    constructor(config: Config) {
        this._config = config;
        const meterProviderConfig: MeterProviderOptions = {
            resource: ResourceManager.getInstance().getMetricResource(),
        };
        this._meterProvider = new MeterProvider(meterProviderConfig);
        let exporterConfig: AzureExporterConfig = {
            connectionString: config.getConnectionString(),
            aadTokenCredential: config.aadTokenCredential
        };
        this._azureExporter = new AzureMonitorMetricExporter(exporterConfig);
        const metricReaderOptions: PeriodicExportingMetricReaderOptions = {
            exporter: this._azureExporter,
            exportIntervalMillis: this._collectionInterval
        };
        this._metricReader = new PeriodicExportingMetricReader(metricReaderOptions);
        this._meterProvider.addMetricReader(this._metricReader);
        this._meter = this._meterProvider.getMeter("ApplicationInsightsStandardMetricsMeter");

        this._exceptionMetrics = new ExceptionMetrics(this._meter);
        this._traceMetrics = new TraceMetrics(this._meter);

        const httpMetricsConfig: HttpMetricsInstrumentationConfig = {
            ignoreOutgoingRequestHook: (request: RequestOptions) => {
                if (request.headers && request.headers["user-agent"]) {
                    return request.headers["user-agent"].toString().indexOf("azsdk-js-monitor-opentelemetry-exporter") > -1;
                }
                return false;
            }
        };
        this._httpMetrics = new HttpMetricsInstrumentation(httpMetricsConfig);
    }

    public enable(isEnabled: boolean) {
        this._exceptionMetrics.enable(isEnabled);
        this._traceMetrics.enable(isEnabled);
        // TODO: Enable/Disable instrumentation
    }

    public getHttpMetricsInstrumentation(): HttpMetricsInstrumentation {
        return this._httpMetrics;
    }

    public getExceptionMetrics(): ExceptionMetrics {
        return this._exceptionMetrics;
    }

    public getTraceMetrics(): TraceMetrics {
        return this._traceMetrics;
    }
}
