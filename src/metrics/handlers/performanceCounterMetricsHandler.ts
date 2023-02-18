// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
    AzureMonitorExporterOptions,
    AzureMonitorMetricExporter,
} from "@azure/monitor-opentelemetry-exporter";
import { Meter, SpanKind } from "@opentelemetry/api";
import {
    DropAggregation,
    MeterProvider,
    MeterProviderOptions,
    PeriodicExportingMetricReader,
    PeriodicExportingMetricReaderOptions,
    View,
} from "@opentelemetry/sdk-metrics";
import {
    MetricName,
    NativeMetricsCounter,
    PerformanceCounter,
} from "../types";
import { ProcessMetrics } from "../collection/processMetrics";
import { RequestMetrics } from "../collection/requestMetrics";
import { ApplicationInsightsConfig, ResourceManager } from "../../shared";
import { NativePerformanceMetrics } from "../collection/nativePerformanceMetrics";
import { ReadableSpan } from "@opentelemetry/sdk-trace-base";


export class PerformanceCounterMetricsHandler {
    private _config: ApplicationInsightsConfig;
    private _collectionInterval = 60000; // 60 seconds
    private _meterProvider: MeterProvider;
    private _azureExporter: AzureMonitorMetricExporter;
    private _metricReader: PeriodicExportingMetricReader;
    private _meter: Meter;
    private _processMetrics: ProcessMetrics;
    private _requestMetrics: RequestMetrics;
    private _nativeMetrics: NativePerformanceMetrics;

    constructor(config: ApplicationInsightsConfig, options?: { collectionInterval: number }) {
        this._config = config;
        const meterProviderConfig: MeterProviderOptions = {
            resource: ResourceManager.getInstance().getMetricResource(),
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
        this._meter = this._meterProvider.getMeter("ApplicationInsightsPerfMetricsMeter");
        this._processMetrics = new ProcessMetrics(this._meter);
        this._requestMetrics = new RequestMetrics(this._meter);
        this._nativeMetrics = new NativePerformanceMetrics(this._meter);
    }

    public start() {
        this._processMetrics.enable(true);
        this._requestMetrics.enable(true);
        this._nativeMetrics.enable(true);
    }

    public shutdown() {
        this._meterProvider.shutdown();
    }

    public recordSpan(span: ReadableSpan): void {
        if (span.kind == SpanKind.SERVER) {
            this._requestMetrics.setRequestRate(span);
        }
    }

    private _getViews(): View[] {
        const views = [];
        views.push(
            new View({
                name: PerformanceCounter.REQUEST_DURATION,
                instrumentName: MetricName.REQUEST_DURATION,
                attributeKeys: [], // Drop all dimensions
            })
        );
        views.push(
            new View({
                name: PerformanceCounter.REQUEST_RATE,
                instrumentName: MetricName.REQUEST_RATE,
            })
        );
        views.push(
            new View({
                name: PerformanceCounter.PRIVATE_BYTES,
                instrumentName: MetricName.PRIVATE_BYTES,
            })
        );
        views.push(
            new View({
                name: PerformanceCounter.AVAILABLE_BYTES,
                instrumentName: MetricName.AVAILABLE_BYTES,
            })
        );
        views.push(
            new View({
                name: PerformanceCounter.PROCESSOR_TIME,
                instrumentName: MetricName.PROCESSOR_TIME,
            })
        );
        views.push(
            new View({
                name: PerformanceCounter.PROCESS_TIME,
                instrumentName: MetricName.PROCESS_TIME,
            })
        );

        // Ignore list
        views.push(
            new View({
                instrumentName: MetricName.COMMITTED_BYTES,
                aggregation: new DropAggregation(),
            })
        );
        views.push(
            new View({
                instrumentName: MetricName.REQUEST_FAILURE_RATE,
                aggregation: new DropAggregation(),
            })
        );
        views.push(
            new View({
                instrumentName: MetricName.DEPENDENCY_DURATION,
                aggregation: new DropAggregation(),
            })
        );
        views.push(
            new View({
                instrumentName: MetricName.DEPENDENCY_FAILURE_RATE,
                aggregation: new DropAggregation(),
            })
        );
        views.push(
            new View({
                instrumentName: MetricName.DEPENDENCY_RATE,
                aggregation: new DropAggregation(),
            })
        );
        if (!this._config.extendedMetrics?.gc) {
            views.push(
                new View({
                    instrumentName: NativeMetricsCounter.GARBAGE_COLLECTION_INCREMENTAL_MARKING,
                    aggregation: new DropAggregation(),
                })
            );
            views.push(
                new View({
                    instrumentName: NativeMetricsCounter.GARBAGE_COLLECTION_SCAVENGE,
                    aggregation: new DropAggregation(),
                })
            );
            views.push(
                new View({
                    instrumentName: NativeMetricsCounter.GARBAGE_COLLECTION_SWEEP_COMPACT,
                    aggregation: new DropAggregation(),
                })
            );
        }
        if (!this._config.extendedMetrics?.heap) {
            views.push(
                new View({
                    instrumentName: NativeMetricsCounter.HEAP_MEMORY_TOTAL,
                    aggregation: new DropAggregation(),
                })
            );
            views.push(
                new View({
                    instrumentName: NativeMetricsCounter.HEAP_MEMORY_USAGE,
                    aggregation: new DropAggregation(),
                })
            );
            views.push(
                new View({
                    instrumentName: NativeMetricsCounter.MEMORY_USAGE_NON_HEAP,
                    aggregation: new DropAggregation(),
                })
            );
        }
        if (!this._config.extendedMetrics?.loop) {
            views.push(
                new View({
                    instrumentName: NativeMetricsCounter.EVENT_LOOP_CPU,
                    aggregation: new DropAggregation(),
                })
            );
        }
        return views;
    }

    public async flush(): Promise<void> {
        await this._meterProvider.forceFlush();
    }
}
