import * as assert from "assert";
import { ProxyTracerProvider, metrics, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ApplicationInsightsClient } from "../../src/applicationInsightsClient";
import { LoggerProvider } from "@opentelemetry/sdk-logs";


describe("ApplicationInsightsClient", () => {
    let client: ApplicationInsightsClient;

    afterEach(() => {
        client.shutdown();
    });

    it("OTLP Exporters added", () => {
        client = new ApplicationInsightsClient({
            azureMonitorExporterConfig:
                { connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333" },
            otlpMetricExporterConfig: { enabled: true },
            otlpTraceExporterConfig: { enabled: true },
            otlpLogExporterConfig: { enabled: true }
        });
        let meterProvider = metrics.getMeterProvider() as any;
        let metricCollectors = meterProvider["_sharedState"]["metricCollectors"];
        assert.ok(metricCollectors.length == 2, "wrong number of metric collectors");
        let otlpExporter = metricCollectors[1]["_metricReader"]["_exporter"];
        assert.ok(otlpExporter instanceof OTLPMetricExporter, "wrong exporter");

        let tracerProvider = ((trace.getTracerProvider() as ProxyTracerProvider).getDelegate() as any);
        let spanProcessors = tracerProvider["_registeredSpanProcessors"];
        assert.ok(spanProcessors.length == 3, "wrong number of spanProcessors");
        otlpExporter = spanProcessors[2]["_exporter"];
        assert.ok(otlpExporter instanceof OTLPTraceExporter, "wrong exporter");

        let loggerProvider = ((logs.getLoggerProvider() as LoggerProvider) as any);
        let logRecordProcessors = loggerProvider["_registeredLogRecordProcessors"];
        assert.ok(logRecordProcessors.length == 3, "wrong number of logRecordProcessors");
        otlpExporter = logRecordProcessors[2]["_exporter"];
        assert.ok(otlpExporter instanceof OTLPLogExporter, "wrong exporter");
    });
});
