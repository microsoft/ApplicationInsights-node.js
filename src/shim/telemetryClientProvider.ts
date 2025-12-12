// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { diag } from "@opentelemetry/api";
import { AzureMonitorLogExporter, AzureMonitorMetricExporter, AzureMonitorTraceExporter } from "@azure/monitor-opentelemetry-exporter";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { LogRecordProcessor, BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { MetricReader, MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { ParentBasedSampler, Sampler, SpanProcessor, TraceIdRatioBasedSampler, BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { Resource, defaultResource } from "@opentelemetry/resources";
import { AzureMonitorOpenTelemetryOptions } from "../types";

/**
 * Provides isolated OpenTelemetry providers for a TelemetryClient instance.
 */
export class TelemetryClientProvider {
    private _tracerProvider: NodeTracerProvider;
    private _meterProvider: MeterProvider;
    private _loggerProvider: LoggerProvider;
    private _metricReaders: MetricReader[] = [];
    private _spanProcessors: SpanProcessor[] = [];
    private _logProcessors: LogRecordProcessor[] = [];

    constructor(private _options: AzureMonitorOpenTelemetryOptions) {
        const resource = this._options.resource ?? defaultResource();

        this._spanProcessors = this._setupTracing();
        this._logProcessors = this._setupLogging();
        this._metricReaders = this._setupMetrics();

        this._tracerProvider = new NodeTracerProvider({
            resource,
            sampler: this._createSampler(),
            spanProcessors: this._spanProcessors,
        });
        this._meterProvider = new MeterProvider({
            resource,
            readers: this._metricReaders,
        });
        this._loggerProvider = new LoggerProvider({
            resource,
            processors: this._logProcessors,
        });
    }

    public getTracer(name: string) {
        return this._tracerProvider.getTracer(name);
    }

    public getMeter(name: string) {
        return this._meterProvider.getMeter(name);
    }

    public getLogger(name: string) {
        return this._loggerProvider.getLogger(name);
    }

    public async flush() {
        await Promise.all([
            this._runWithErrorHandling(this._meterProvider.forceFlush(), "Failed to flush metrics"),
            this._runWithErrorHandling(this._tracerProvider.forceFlush(), "Failed to flush traces"),
            this._runWithErrorHandling(this._loggerProvider.forceFlush(), "Failed to flush logs"),
        ]);
    }

    public async shutdown() {
        await Promise.all([
            ...this._metricReaders.map((reader) => this._runWithErrorHandling(reader.shutdown(), "Failed to shutdown metric reader")),
            ...this._spanProcessors.map((processor) => this._runWithErrorHandling(processor.shutdown(), "Failed to shutdown span processor")),
            ...this._logProcessors.map((processor) => this._runWithErrorHandling(processor.shutdown(), "Failed to shutdown log processor")),
            this._runWithErrorHandling(this._meterProvider.shutdown(), "Failed to shutdown meter provider"),
            this._runWithErrorHandling(this._tracerProvider.shutdown(), "Failed to shutdown tracer provider"),
            this._runWithErrorHandling(this._loggerProvider.shutdown(), "Failed to shutdown logger provider"),
        ]);
    }

    private _createSampler(): Sampler | undefined {
        if (this._options?.samplingRatio === undefined) {
            return undefined;
        }
        return new ParentBasedSampler({
            root: new TraceIdRatioBasedSampler(this._options.samplingRatio),
        });
    }

    private _setupTracing(): SpanProcessor[] {
        const processors: SpanProcessor[] = [];
        try {
            const exporter = new AzureMonitorTraceExporter(this._options.azureMonitorExporterOptions);
            processors.push(new BatchSpanProcessor(exporter));
        } catch (error) {
            diag.error("Failed to configure Azure Monitor trace exporter", error);
        }

        if (this._options.otlpTraceExporterConfig?.enabled) {
            try {
                const otlpExporter = new OTLPTraceExporter(this._options.otlpTraceExporterConfig);
                processors.push(new BatchSpanProcessor(otlpExporter));
            } catch (error) {
                diag.error("Failed to configure OTLP trace exporter", error);
            }
        }

        if (this._options.spanProcessors) {
            for (const processor of this._options.spanProcessors) {
                processors.push(processor);
            }
        }

        return processors;
    }

    private _setupLogging(): LogRecordProcessor[] {
        const processors: LogRecordProcessor[] = [];
        try {
            const exporter = new AzureMonitorLogExporter(this._options.azureMonitorExporterOptions);
            processors.push(new BatchLogRecordProcessor(exporter));
        } catch (error) {
            diag.error("Failed to configure Azure Monitor log exporter", error);
        }

        if (this._options.otlpLogExporterConfig?.enabled) {
            try {
                const otlpExporter = new OTLPLogExporter(this._options.otlpLogExporterConfig);
                processors.push(new BatchLogRecordProcessor(otlpExporter));
            } catch (error) {
                diag.error("Failed to configure OTLP log exporter", error);
            }
        }

        if (this._options.logRecordProcessors) {
            for (const processor of this._options.logRecordProcessors) {
                processors.push(processor);
            }
        }

        return processors;
    }

    private _setupMetrics(): MetricReader[] {
        const readers: MetricReader[] = [];
        try {
            const exporter = new AzureMonitorMetricExporter(this._options.azureMonitorExporterOptions);
            readers.push(new PeriodicExportingMetricReader({ exporter }));
        } catch (error) {
            diag.error("Failed to configure Azure Monitor metric exporter", error);
        }

        if (this._options.otlpMetricExporterConfig?.enabled) {
            try {
                const otlpExporter = new OTLPMetricExporter(this._options.otlpMetricExporterConfig);
                readers.push(new PeriodicExportingMetricReader({ exporter: otlpExporter }));
            } catch (error) {
                diag.error("Failed to configure OTLP metric exporter", error);
            }
        }

        return readers;
    }

    private async _runWithErrorHandling<T>(promise: Promise<T>, message: string) {
        try {
            await promise;
        } catch (error) {
            diag.error(message, error);
        }
    }
}
