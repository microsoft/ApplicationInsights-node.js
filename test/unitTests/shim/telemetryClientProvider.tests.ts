// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import * as assert from "assert";
import * as sinon from "sinon";
import { Context } from "@opentelemetry/api";
import { LogRecord } from "@opentelemetry/api-logs";
import { AzureMonitorLogExporter, AzureMonitorMetricExporter, AzureMonitorTraceExporter } from "@azure/monitor-opentelemetry-exporter";
import { BatchLogRecordProcessor, LoggerProvider, LogRecordProcessor } from "@opentelemetry/sdk-logs";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchSpanProcessor, ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { TelemetryClientProvider } from "../../../src/shim/telemetryClientProvider";
import { AzureMonitorOpenTelemetryOptions } from "../../../src/types";

describe("shim/TelemetryClientProvider", () => {
    const CONNECTION_STRING = "InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=https://example.com/";
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    function createOptions(overrides: Partial<AzureMonitorOpenTelemetryOptions> = {}): AzureMonitorOpenTelemetryOptions {
        return {
            azureMonitorExporterOptions: {
                connectionString: CONNECTION_STRING,
            },
            ...overrides,
        } as AzureMonitorOpenTelemetryOptions;
    }

    it("registers Azure Monitor processors by default", () => {
        const provider = new TelemetryClientProvider(createOptions());

        const registeredSpanProcessors = (provider as any)._spanProcessors as SpanProcessor[];
        const registeredLogProcessors = (provider as any)._logProcessors as LogRecordProcessor[];
        const registeredMetricReaders = (provider as any)._metricReaders as PeriodicExportingMetricReader[];

        assert.ok(
            registeredSpanProcessors.some((processor) =>
                processor instanceof BatchSpanProcessor && (processor as any)._exporter instanceof AzureMonitorTraceExporter
            )
        );
        assert.ok(
            registeredLogProcessors.some((processor) =>
                processor instanceof BatchLogRecordProcessor && (processor as any)._exporter instanceof AzureMonitorLogExporter
            )
        );
        assert.ok(
            registeredMetricReaders.some((reader) =>
                reader instanceof PeriodicExportingMetricReader && (reader as any)._exporter instanceof AzureMonitorMetricExporter
            )
        );
    });

    it("registers OTLP exporters when enabled", () => {
        const provider = new TelemetryClientProvider(
            createOptions({
                otlpTraceExporterConfig: { enabled: true, url: "http://localhost/v1/traces" },
                otlpLogExporterConfig: { enabled: true, url: "http://localhost/v1/logs" },
                otlpMetricExporterConfig: { enabled: true, url: "http://localhost/v1/metrics" },
            })
        );

        const registeredSpanExporters = ((provider as any)._spanProcessors as SpanProcessor[]).map((processor) => (processor as any)._exporter);
        const registeredLogExporters = ((provider as any)._logProcessors as LogRecordProcessor[]).map((processor) => (processor as any)._exporter);
        const registeredMetricExporters = ((provider as any)._metricReaders as PeriodicExportingMetricReader[]).map((reader) => (reader as any)._exporter);

        assert.ok(registeredSpanExporters.some((exporter) => exporter instanceof AzureMonitorTraceExporter));
        assert.ok(registeredSpanExporters.some((exporter) => exporter instanceof OTLPTraceExporter));
        assert.ok(registeredLogExporters.some((exporter) => exporter instanceof AzureMonitorLogExporter));
        assert.ok(registeredLogExporters.some((exporter) => exporter instanceof OTLPLogExporter));
        assert.ok(registeredMetricExporters.some((exporter) => exporter instanceof AzureMonitorMetricExporter));
        assert.ok(registeredMetricExporters.some((exporter) => exporter instanceof OTLPMetricExporter));
    });

    it("flushes underlying providers", async () => {
        const tracerFlushStub = sandbox.stub(NodeTracerProvider.prototype, "forceFlush").resolves();
        const meterFlushStub = sandbox.stub(MeterProvider.prototype, "forceFlush").resolves();
        const loggerFlushStub = sandbox.stub(LoggerProvider.prototype, "forceFlush").resolves();

        const provider = new TelemetryClientProvider(createOptions());
        await provider.flush();

        assert.ok(tracerFlushStub.calledOnce);
        assert.ok(meterFlushStub.calledOnce);
        assert.ok(loggerFlushStub.calledOnce);
    });

    it("shuts down providers and processors", async () => {
        const tracerShutdownStub = sandbox.stub(NodeTracerProvider.prototype, "shutdown").resolves();
        const meterShutdownStub = sandbox.stub(MeterProvider.prototype, "shutdown").resolves();
        const loggerShutdownStub = sandbox.stub(LoggerProvider.prototype, "shutdown").resolves();
        const metricReaderShutdownStub = sandbox.stub(PeriodicExportingMetricReader.prototype, "shutdown").resolves();

        const spanProcessor = new TestSpanProcessor(sandbox);
        const logProcessor = new TestLogProcessor(sandbox);

        const provider = new TelemetryClientProvider(
            createOptions({
                spanProcessors: [spanProcessor],
                logRecordProcessors: [logProcessor],
            })
        );

        await provider.shutdown();

        assert.ok(tracerShutdownStub.calledOnce);
        assert.ok(meterShutdownStub.calledOnce);
        assert.ok(loggerShutdownStub.calledOnce);
        assert.ok(metricReaderShutdownStub.called);
        assert.ok(spanProcessor.shutdownStub.calledOnce);
        assert.ok(logProcessor.shutdownStub.calledOnce);
    });

    class TestSpanProcessor implements SpanProcessor {
        public shutdownStub: sinon.SinonStub<[], Promise<void>>;
        public forceFlushStub: sinon.SinonStub<[], Promise<void>>;

        constructor(s: sinon.SinonSandbox) {
            this.shutdownStub = s.stub<[], Promise<void>>().resolves();
            this.forceFlushStub = s.stub<[], Promise<void>>().resolves();
        }

        onStart(_span: Span, _parentContext: Context): void {
            return;
        }

        onEnd(_span: ReadableSpan): void {
            return;
        }

        shutdown(): Promise<void> {
            return this.shutdownStub();
        }

        forceFlush(): Promise<void> {
            return this.forceFlushStub();
        }
    }

    class TestLogProcessor implements LogRecordProcessor {
        public onEmitStub: sinon.SinonStub<[LogRecord], void>;
        public shutdownStub: sinon.SinonStub<[], Promise<void>>;
        public forceFlushStub: sinon.SinonStub<[], Promise<void>>;

        constructor(s: sinon.SinonSandbox) {
            this.onEmitStub = s.stub<[LogRecord], void>();
            this.shutdownStub = s.stub<[], Promise<void>>().resolves();
            this.forceFlushStub = s.stub<[], Promise<void>>().resolves();
        }

        onEmit(record: LogRecord): void {
            this.onEmitStub(record);
        }

        shutdown(): Promise<void> {
            return this.shutdownStub();
        }

        forceFlush(): Promise<void> {
            return this.forceFlushStub();
        }
    }
});
