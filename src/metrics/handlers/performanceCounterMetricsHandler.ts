// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
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
import { ApplicationInsightsConfig } from "../../shared";
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

    constructor(config: ApplicationInsightsConfig, options?: { collectionInterval: number }) {
        this._config = config;
        const meterProviderConfig: MeterProviderOptions = {
            resource: this._config.resource,
            views: this._getViews(),
        };
        this._meterProvider = new MeterProvider(meterProviderConfig);
        this._azureExporter = new AzureMonitorMetricExporter(this._config.azureMonitorExporterConfig);
        const metricReaderOptions: PeriodicExportingMetricReaderOptions = {
            exporter: this._azureExporter as any,
            exportIntervalMillis: options?.collectionInterval || this._collectionInterval,
        };
        this._metricReader = new PeriodicExportingMetricReader(metricReaderOptions);
        this._meterProvider.addMetricReader(this._metricReader);
        this._meter = this._meterProvider.getMeter("ApplicationInsightsPerfMetricsMeter");
        this._processMetrics = new ProcessMetrics(this._meter);
        this._requestMetrics = new RequestMetrics(this._meter);
    }

     /** 
   * @deprecated This should not be used
   */
     public start() {
        // No Op
    }

    public shutdown() {
        this._processMetrics.shutdown();
        this._requestMetrics.shutdown();
        this._meterProvider.shutdown();
    }

    public recordSpan(span: ReadableSpan): void {
        if (span.kind === SpanKind.SERVER) {
            this._requestMetrics.setRequestRate(span);
        }
    }

    private _getViews(): View[] {
        const views = [];
        views.push(
            new View({
                name: PerformanceCounter.REQUEST_DURATION,
                instrumentName: MetricName.REQUEST_DURATION,
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
        return views;
    }

    public async flush(): Promise<void> {
        await this._meterProvider.forceFlush();
    }
}
