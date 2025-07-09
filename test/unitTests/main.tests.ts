// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import assert from "assert";
import { ProxyTracerProvider, metrics, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { LoggerProvider } from "@opentelemetry/sdk-logs";
import { shutdownAzureMonitor, useAzureMonitor, getExtensibleSpanProcessor, getExtensibleLogRecordProcessor } from "../../src";

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
        // Check that ExtensibleSpanProcessor exists and has OTLP exporter
        let extensibleSpanProcessor = getExtensibleSpanProcessor();
        assert.ok(extensibleSpanProcessor, "ExtensibleSpanProcessor should exist");
        let spanProcessors = extensibleSpanProcessor.getProcessors();
        let hasOtlpProcessor = spanProcessors.some(processor => {
            return (processor as any)._exporter instanceof OTLPTraceExporter;
        });
        assert.ok(hasOtlpProcessor, "Should have OTLP trace processor");

        // Check that ExtensibleLogRecordProcessor exists and has OTLP exporter
        let extensibleLogProcessor = getExtensibleLogRecordProcessor();
        assert.ok(extensibleLogProcessor, "ExtensibleLogRecordProcessor should exist");
        let logProcessors = extensibleLogProcessor.getProcessors();
        let hasOtlpLogProcessor = logProcessors.some(processor => {
            return (processor as any)._exporter instanceof OTLPLogExporter;
        });
        assert.ok(hasOtlpLogProcessor, "Should have OTLP log processor");
    });
});
