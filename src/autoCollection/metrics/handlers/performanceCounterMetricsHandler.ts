// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { RequestOptions } from "https";
import { AzureExporterConfig, AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
import { Meter } from "@opentelemetry/api-metrics";
import { DropAggregation, MeterProvider, MeterProviderOptions, PeriodicExportingMetricReader, PeriodicExportingMetricReaderOptions, View } from "@opentelemetry/sdk-metrics";
import { HttpMetricsInstrumentationConfig, MetricName, NativeMetricsCounter, PerformanceCounter } from "../types";
import { AzureHttpMetricsInstrumentation } from "../collection/azureHttpMetricsInstrumentation";
import { ProcessMetrics } from "../collection/processMetrics";
import { RequestMetrics } from "../collection/requestMetrics";
import { Config } from "../../../library";
import { ResourceManager } from "../../../library/handlers";
import { getNativeMetricsConfig, NativePerformanceMetrics } from "../collection/nativePerformanceMetrics";
import { IDisabledExtendedMetrics } from "../../../library/configuration/interfaces";


export class PerformanceCounterMetricsHandler {
    private _config: Config;
    private _collectionInterval: number = 60000; // 60 seconds
    private _meterProvider: MeterProvider;
    private _azureExporter: AzureMonitorMetricExporter;
    private _metricReader: PeriodicExportingMetricReader;
    private _meter: Meter;
    private _httpMetrics: AzureHttpMetricsInstrumentation;
    private _processMetrics: ProcessMetrics;
    private _requestMetrics: RequestMetrics;
    private _nativeMetrics: NativePerformanceMetrics;

    constructor(config: Config, options?: { collectionInterval: number }) {
        this._config = config;
        const nativePerformanceConfig = getNativeMetricsConfig(
            this._config.enableAutoCollectExtendedMetrics,
            this._config
        );
        const meterProviderConfig: MeterProviderOptions = {
            resource: ResourceManager.getInstance().getMetricResource(),
            views: this._getViews(nativePerformanceConfig)
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
        this._meter = this._meterProvider.getMeter("ApplicationInsightsPerfMetricsMeter");

        const httpMetricsConfig: HttpMetricsInstrumentationConfig = {
            ignoreOutgoingRequestHook: (request: RequestOptions) => {
                if (request.headers && request.headers["user-agent"]) {
                    return request.headers["user-agent"].toString().indexOf("azsdk-js-monitor-opentelemetry-exporter") > -1;
                }
                return false;
            }
        };
        this._httpMetrics = new AzureHttpMetricsInstrumentation(httpMetricsConfig);
        this._processMetrics = new ProcessMetrics(this._meter);
        this._requestMetrics = new RequestMetrics(this._meter, this._httpMetrics);
        if (nativePerformanceConfig.isEnabled) {
            this._nativeMetrics = new NativePerformanceMetrics(this._meter);
        }
    }

    public start() {
        this._processMetrics.enable(true);;
        this._requestMetrics.enable(true);
        this._nativeMetrics?.enable(true);
    }

    public shutdown() {
        this._meterProvider.shutdown();
    }

    public getHttpMetricsInstrumentation(): AzureHttpMetricsInstrumentation {
        return this._httpMetrics;
    }

    public getProcessMetrics(): ProcessMetrics {
        return this._processMetrics;
    }

    public getRequestMetrics(): RequestMetrics {
        return this._requestMetrics;
    }

    private _getViews(nativePerformanceConfig: { isEnabled: boolean; disabledMetrics: IDisabledExtendedMetrics }): View[] {
        let views = [];
        views.push(new View({
            name: PerformanceCounter.REQUEST_DURATION,
            instrumentName: MetricName.REQUEST_DURATION,
            attributeKeys: [] // Drop all dimensions
        }));
        views.push(new View({
            name: PerformanceCounter.REQUEST_RATE,
            instrumentName: MetricName.REQUEST_RATE,
        }));
        views.push(new View({
            name: PerformanceCounter.PRIVATE_BYTES,
            instrumentName: MetricName.PRIVATE_BYTES,
        }));
        views.push(new View({
            name: PerformanceCounter.AVAILABLE_BYTES,
            instrumentName: MetricName.AVAILABLE_BYTES,
        }));
        views.push(new View({
            name: PerformanceCounter.PROCESSOR_TIME,
            instrumentName: MetricName.PROCESSOR_TIME,
        }));
        views.push(new View({
            name: PerformanceCounter.PROCESS_TIME,
            instrumentName: MetricName.PROCESS_TIME,
        }));

        // Ignore list
        views.push(new View({
            instrumentName: MetricName.COMMITTED_BYTES,
            aggregation: new DropAggregation(),
        }));
        views.push(new View({
            instrumentName: MetricName.REQUEST_FAILURE_RATE,
            aggregation: new DropAggregation(),
        }));
        views.push(new View({
            instrumentName: MetricName.DEPENDENCY_DURATION,
            aggregation: new DropAggregation(),
        }));
        views.push(new View({
            instrumentName: MetricName.DEPENDENCY_FAILURE_RATE,
            aggregation: new DropAggregation(),
        }));
        views.push(new View({
            instrumentName: MetricName.DEPENDENCY_RATE,
            aggregation: new DropAggregation(),
        }));
        if (nativePerformanceConfig.isEnabled) {
            if (nativePerformanceConfig.disabledMetrics?.gc) {
                views.push(new View({
                    instrumentName: NativeMetricsCounter.GARBAGE_COLLECTION_INCREMENTAL_MARKING,
                    aggregation: new DropAggregation(),
                }));
                views.push(new View({
                    instrumentName: NativeMetricsCounter.GARBAGE_COLLECTION_SCAVENGE,
                    aggregation: new DropAggregation(),
                }));
                views.push(new View({
                    instrumentName: NativeMetricsCounter.GARBAGE_COLLECTION_SWEEP_COMPACT,
                    aggregation: new DropAggregation(),
                }));
            }
            if (nativePerformanceConfig.disabledMetrics?.heap) {
                views.push(new View({
                    instrumentName: NativeMetricsCounter.HEAP_MEMORY_TOTAL,
                    aggregation: new DropAggregation(),
                }));
                views.push(new View({
                    instrumentName: NativeMetricsCounter.HEAP_MEMORY_USAGE,
                    aggregation: new DropAggregation(),
                }));
                views.push(new View({
                    instrumentName: NativeMetricsCounter.MEMORY_USAGE_NON_HEAP,
                    aggregation: new DropAggregation(),
                }));
            }
            if (nativePerformanceConfig.disabledMetrics?.heap) {
                views.push(new View({
                    instrumentName: NativeMetricsCounter.EVENT_LOOP_CPU,
                    aggregation: new DropAggregation(),
                }));
            }
        }
        return views;
    }
}
