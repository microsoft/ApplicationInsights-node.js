import { AzureMonitorExporterOptions, AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
import { Meter } from "@opentelemetry/api-metrics";
import { DropAggregation, MeterProvider, MeterProviderOptions, PeriodicExportingMetricReader, PeriodicExportingMetricReaderOptions, View } from "@opentelemetry/sdk-metrics";
import { RequestOptions } from "https";
import { Config } from "../../../library";
import { ResourceManager } from "../../../library/handlers";
import { DependencyMetrics } from "../collection/dependencyMetrics";
import { ExceptionMetrics } from "../collection/exceptionMetrics";
import { AzureHttpMetricsInstrumentation } from "../collection/azureHttpMetricsInstrumentation";
import { ProcessMetrics } from "../collection/processMetrics";
import { RequestMetrics } from "../collection/requestMetrics";
import { HttpMetricsInstrumentationConfig, MetricName, QuickPulseCounter } from "../types";


export class LiveMetricsHandler {
    private _config: Config;
    private _collectionInterval: number = 60000; // 60 seconds
    private _meterProvider: MeterProvider;
    private _azureExporter: AzureMonitorMetricExporter;
    private _metricReader: PeriodicExportingMetricReader;
    private _meter: Meter;
    private _exceptionMetrics: ExceptionMetrics;
    private _httpMetrics: AzureHttpMetricsInstrumentation;
    private _processMetrics: ProcessMetrics;
    private _requestMetrics: RequestMetrics;
    private _dependencyMetrics: DependencyMetrics;

    constructor(config: Config, options?: { collectionInterval: number }) {
        this._config = config;
        const meterProviderConfig: MeterProviderOptions = {
            resource: ResourceManager.getInstance().getMetricResource(),
            views: this._getViews()
        };
        this._meterProvider = new MeterProvider(meterProviderConfig);
        let exporterConfig: AzureMonitorExporterOptions = {
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
        this._meter = this._meterProvider.getMeter("ApplicationInsightsLiveMetricsMeter");
        const httpMetricsConfig: HttpMetricsInstrumentationConfig = {
            ignoreOutgoingRequestHook: (request: RequestOptions) => {
                if (request.headers && request.headers["user-agent"]) {
                    return request.headers["user-agent"].toString().indexOf("azsdk-js-monitor-opentelemetry-exporter") > -1;
                }
                return false;
            }
        };
        this._processMetrics = new ProcessMetrics(this._meter);
        this._exceptionMetrics = new ExceptionMetrics(this._meter);
        this._httpMetrics = new AzureHttpMetricsInstrumentation(httpMetricsConfig);
        this._requestMetrics = new RequestMetrics(this._meter, this._httpMetrics);
        this._dependencyMetrics = new DependencyMetrics(this._meter, this._httpMetrics);
    }

    public start() {
        this._processMetrics.enable(true);
        this._requestMetrics.enable(true);
        this._dependencyMetrics.enable(true);
    }

    public shutdown() {
        this._meterProvider.shutdown();
    }

    public getHttpMetricsInstrumentation(): AzureHttpMetricsInstrumentation {
        return this._httpMetrics;
    }

    public getExceptionMetrics(): ExceptionMetrics {
        return this._exceptionMetrics;
    }

    public getRequestMetrics(): RequestMetrics {
        return this._requestMetrics;
    }

    public getDependencyMetrics(): DependencyMetrics {
        return this._dependencyMetrics;
    }

    public getProcessMetrics(): ProcessMetrics {
        return this._processMetrics;
    }

    private _getViews(): View[] {
        let views = [];
        // Use Names expected by Quickpulse
        views.push(new View({
            name: QuickPulseCounter.REQUEST_DURATION,
            instrumentName: MetricName.REQUEST_DURATION,
            attributeKeys: [] // Drop all dimensions
        }));
        views.push(new View({
            name: QuickPulseCounter.REQUEST_FAILURE_RATE,
            instrumentName: MetricName.REQUEST_FAILURE_RATE,
        }));
        views.push(new View({
            name: QuickPulseCounter.REQUEST_RATE,
            instrumentName: MetricName.REQUEST_RATE
        }));
        views.push(new View({
            name: QuickPulseCounter.DEPENDENCY_DURATION,
            instrumentName: MetricName.DEPENDENCY_DURATION,
            attributeKeys: [] // Drop all dimensions
        }));
        views.push(new View({
            name: QuickPulseCounter.DEPENDENCY_FAILURE_RATE,
            instrumentName: MetricName.DEPENDENCY_FAILURE_RATE
        }));
        views.push(new View({
            name: QuickPulseCounter.DEPENDENCY_RATE,
            instrumentName: MetricName.DEPENDENCY_RATE
        }));
        views.push(new View({
            name: QuickPulseCounter.EXCEPTION_RATE,
            instrumentName: MetricName.EXCEPTION_RATE
        }));
        views.push(new View({
            name: QuickPulseCounter.COMMITTED_BYTES,
            instrumentName: MetricName.COMMITTED_BYTES
        }));
        views.push(new View({
            name: QuickPulseCounter.PROCESSOR_TIME,
            instrumentName: MetricName.PROCESSOR_TIME
        }));

        // Ignore 
        views.push(new View({
            instrumentName: MetricName.PRIVATE_BYTES,
            aggregation: new DropAggregation(),
        }));
        views.push(new View({
            instrumentName: MetricName.AVAILABLE_BYTES,
            aggregation: new DropAggregation(),
        }));
        views.push(new View({
            instrumentName: MetricName.PROCESSOR_TIME,
            aggregation: new DropAggregation(),
        }));
        views.push(new View({
            instrumentName: MetricName.PROCESS_TIME,
            aggregation: new DropAggregation(),
        }));
        views.push(new View({
            instrumentName: MetricName.EXCEPTION_COUNT,
            aggregation: new DropAggregation(),
        }));
        views.push(new View({
            instrumentName: MetricName.TRACE_COUNT,
            aggregation: new DropAggregation(),
        }));
        return views;
    }
}
