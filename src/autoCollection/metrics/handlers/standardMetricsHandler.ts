import { AzureExporterConfig, AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
import { Meter } from "@opentelemetry/api-metrics";
import { MeterProvider, MeterProviderOptions, PeriodicExportingMetricReader, PeriodicExportingMetricReaderOptions, View } from "@opentelemetry/sdk-metrics";
import { RequestOptions } from "https";
import { Config } from "../../../library";
import { ResourceManager } from "../../../library/handlers";
import { ExceptionMetrics } from "../collection/exceptionMetrics";
import { HttpMetricsInstrumentation } from "../collection/httpMetricsInstrumentation";
import { TraceMetrics } from "../collection/traceMetrics";
import { HttpMetricsInstrumentationConfig, MetricName, StandardMetric } from "../types";


export class StandardMetricsHandler {

    private _config: Config;
    private _collectionInterval: number = 60000; // 60 seconds
    private _meterProvider: MeterProvider;
    private _azureExporter: AzureMonitorMetricExporter;
    private _metricReader: PeriodicExportingMetricReader;
    private _meter: Meter;
    private _exceptionMetrics: ExceptionMetrics;
    private _traceMetrics: TraceMetrics;
    private _httpMetrics: HttpMetricsInstrumentation;

    constructor(config: Config, options?: { collectionInterval: number }) {
        this._config = config;
        const meterProviderConfig: MeterProviderOptions = {
            resource: ResourceManager.getInstance().getMetricResource(),
            views: this._getViews()
        };
        this._meterProvider = new MeterProvider(meterProviderConfig);
        let exporterConfig: AzureExporterConfig = {
            connectionString: this._config.getConnectionString(),
            aadTokenCredential: this._config.aadTokenCredential
        };
        this._azureExporter = new AzureMonitorMetricExporter(exporterConfig);
        const metricReaderOptions: PeriodicExportingMetricReaderOptions = {
            exporter: this._azureExporter as any,
            exportIntervalMillis: options?.collectionInterval || this._collectionInterval
        };
        this._metricReader = new PeriodicExportingMetricReader(metricReaderOptions);
        this._meterProvider.addMetricReader(this._metricReader);
        this._meter = this._meterProvider.getMeter("ApplicationInsightsStandardMetricsMeter");

        const httpMetricsConfig: HttpMetricsInstrumentationConfig = {
            ignoreOutgoingRequestHook: (request: RequestOptions) => {
                if (request.headers && request.headers["user-agent"]) {
                    return request.headers["user-agent"].toString().indexOf("azsdk-js-monitor-opentelemetry-exporter") > -1;
                }
                return false;
            }
        };
        this._httpMetrics = new HttpMetricsInstrumentation(httpMetricsConfig);
        this._exceptionMetrics = new ExceptionMetrics(this._meter);
        this._traceMetrics = new TraceMetrics(this._meter);
    }

    public start() {
        this._exceptionMetrics.enable(true);
        this._traceMetrics.enable(true);
    }

    public shutdown() {
        this._meterProvider.shutdown();
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

    private _getViews(): View[] {
        let views = [];
        views.push(new View({
            name: StandardMetric.REQUESTS,
            instrumentName: MetricName.REQUEST_DURATION,
            attributeKeys: []
        }));
        views.push(new View({
            name: StandardMetric.DEPENDENCIES,
            instrumentName: MetricName.DEPENDENCY_DURATION,
            attributeKeys: []
        }));
        views.push(new View({
            name: StandardMetric.EXCEPTIONS,
            instrumentName: MetricName.EXCEPTION_RATE
        }));
        views.push(new View({
            name: StandardMetric.TRACES,
            instrumentName: MetricName.TRACE_RATE
        }));
        return views;
    }
}