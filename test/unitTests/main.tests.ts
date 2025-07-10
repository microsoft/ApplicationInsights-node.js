// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import assert from "assert";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { trace, ProxyTracerProvider } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { LoggerProvider } from "@opentelemetry/sdk-logs";
import { shutdownAzureMonitor, useAzureMonitor } from "../../src";

describe("ApplicationInsightsClient", () => {
    afterEach(() => {
        shutdownAzureMonitor();
    });

    it("OTLP Exporters added", () => {
        useAzureMonitor({
            azureMonitorExporterOptions:
                { connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333" },
            otlpMetricExporterConfig: { enabled: true },
            otlpTraceExporterConfig: { enabled: true },
            otlpLogExporterConfig: { enabled: true }
        });
        
        // Check that tracer provider is correctly initialized
        const tracerProvider = ((trace.getTracerProvider() as ProxyTracerProvider).getDelegate() as NodeTracerProvider);
        assert.ok(tracerProvider, "TracerProvider should exist");
        
        // Check span processors
        const spanProcessors = (tracerProvider as any)._config?.spanProcessors || [];
        
        let hasOtlpProcessor = spanProcessors.some((processor: any) => {
            return processor._exporter instanceof OTLPTraceExporter;
        });
        assert.ok(hasOtlpProcessor, "Should have OTLP trace processor");

        // Check that logger provider is correctly initialized
        const loggerProvider = logs.getLoggerProvider() as LoggerProvider;
        assert.ok(loggerProvider, "LoggerProvider should exist");
        
        // Check log processors - get them from the TracerProvider config where they're accessible
        const logProcessorsFromTracerConfig = (tracerProvider as any)._config?.logRecordProcessors || [];
        
        const logProcessors = (loggerProvider as any)._config?.processors || 
                             (loggerProvider as any)._processors ||
                             (loggerProvider as any)._config?.logRecordProcessors ||
                             logProcessorsFromTracerConfig;
        
        let hasOtlpLogProcessor = logProcessors.some((processor: any) => {
            return processor._exporter instanceof OTLPLogExporter;
        });
        assert.ok(hasOtlpLogProcessor, "Should have OTLP log processor");
    });
});
