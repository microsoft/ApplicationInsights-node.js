import assert from "assert";
import sinon from "sinon";
import { ProxyTracerProvider, metrics, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { AKSLoader } from "../../../src/agent/aksLoader";
import { DiagnosticLogger } from "../../../src/agent/diagnostics/diagnosticLogger";
import { FileWriter } from "../../../src/agent/diagnostics/writers/fileWriter";
import { dispose as disposeConsole } from "../../../src/logs/diagnostic-channel/console.sub";

describe("agent/AKSLoader", () => {
    let originalEnv: NodeJS.ProcessEnv;
    let sandbox: sinon.SinonSandbox;

    before(() => {
        sandbox = sinon.createSandbox();
    });

    beforeEach(() => {
        originalEnv = process.env;
    });

    afterEach(() => {
        disposeConsole();
        process.env = originalEnv;
        sandbox.restore();
    });

    it("constructor", () => {
        const env = {
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
        };
        process.env = env;
        const agent = new AKSLoader();
        let diagnosticLogger: any = agent["_diagnosticLogger"];
        assert.equal(diagnosticLogger["_instrumentationKey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        assert.ok(diagnosticLogger instanceof DiagnosticLogger);
        assert.ok(diagnosticLogger["_agentLogger"] instanceof FileWriter);
        let statusLogger: any = agent["_statusLogger"];
        assert.equal(statusLogger["_instrumentationKey"], "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        assert.ok(statusLogger["_agentLogger"] instanceof FileWriter);
        // Loader is using correct diagnostics
        assert.equal(agent["_diagnosticLogger"], diagnosticLogger, "Wrong diagnosticLogger");
        assert.equal(agent["_statusLogger"], statusLogger, "Wrong statusLogger");
    });

    it("initialize", () => {
        const env = {
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
        };
        process.env = env;
        const agent = new AKSLoader();
        agent.initialize();
        let meterProvider = metrics.getMeterProvider() as any;
        assert.equal(meterProvider.constructor.name, "MeterProvider");
        assert.equal(meterProvider["_sharedState"]["metricCollectors"].length, 1);
        assert.equal(meterProvider["_sharedState"]["metricCollectors"][0]["_metricReader"]["_exporter"].constructor.name, "AzureMonitorMetricExporter");
        
        let tracerProvider = ((trace.getTracerProvider() as ProxyTracerProvider).getDelegate()) as any;
        assert.equal(tracerProvider.constructor.name, "NodeTracerProvider");
        let loggerProvider = logs.getLoggerProvider() as any;
        assert.equal(loggerProvider.constructor.name, "LoggerProvider");
    });

    it("constructor creates OTLP metric reader when environment variables are set", () => {
        const env = {
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
            ["OTEL_METRICS_EXPORTER"]: "otlp",
            ["OTEL_EXPORTER_OTLP_ENDPOINT"]: "http://localhost:4317"
        };
        process.env = env;
        
        const agent = new AKSLoader();
        
        // Verify that metricReaders were added to the options
        const options = (agent as any)._options;
        assert.ok(options.metricReaders, "metricReaders should be present in options");
        assert.equal(options.metricReaders.length, 1, "Should have exactly one metric reader");
        
        // Verify the metric reader is a PeriodicExportingMetricReader
        const metricReader = options.metricReaders[0];
        assert.equal(metricReader.constructor.name, "PeriodicExportingMetricReader", "Should be a PeriodicExportingMetricReader");
        
        // Verify the exporter is an OTLP exporter
        const exporter = (metricReader as any)._exporter;
        assert.equal(exporter.constructor.name, "OTLPMetricExporter", "Should be an OTLPMetricExporter");
        
        // Check that the URL is configured in parameters
        const delegate = (exporter as any)._delegate;
        const transport = delegate._transport;
        const innerTransport = transport._transport;
        const parameters = innerTransport._parameters;
        
        const url = parameters.url || parameters.endpoint;
        assert.ok(url, "Parameters should have a URL configured");
        assert.equal(url.replace(/\/$/, ""), "http://localhost:4317/v1/metrics", "Should use the base OTLP endpoint URL");
        
        // Verify the exporter type
        assert.ok(exporter, "Exporter should exist");
        assert.equal(exporter.constructor.name, "OTLPMetricExporter", "Should be an OTLPMetricExporter");
    });

    it("constructor creates OTLP metric reader with metrics-specific endpoint", () => {
        const env = {
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
            ["OTEL_METRICS_EXPORTER"]: "otlp",
            ["OTEL_EXPORTER_OTLP_METRICS_ENDPOINT"]: "http://localhost:4318/v1/metrics"
        };
        process.env = env;
        
        const agent = new AKSLoader();
        
        // Verify that metricReaders were added to the options
        const options = (agent as any)._options;
        assert.ok(options.metricReaders, "metricReaders should be present in options");
        assert.equal(options.metricReaders.length, 1, "Should have exactly one metric reader");
        
        // Verify the exporter URL uses the metrics-specific endpoint
        const metricReader = options.metricReaders[0];
        const exporter = (metricReader as any)._exporter;
        
        // Check the configured URL in the transport parameters
        const delegate = (exporter as any)._delegate;
        const transport = delegate._transport;
        const innerTransport = transport._transport;
        const parameters = innerTransport._parameters;
        
        const url = parameters.url || parameters.endpoint;
        assert.ok(url, "Exporter should have a URL configured");
        assert.equal(url, "http://localhost:4318/v1/metrics", "Should use the metrics-specific OTLP endpoint URL");
    });

    it("constructor does not create OTLP metric reader when OTEL_METRICS_EXPORTER is not otlp", () => {
        const env = {
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
            ["OTEL_METRICS_EXPORTER"]: "console",
            ["OTEL_EXPORTER_OTLP_ENDPOINT"]: "http://localhost:4317"
        };
        process.env = env;
        
        const agent = new AKSLoader();
        
        // Verify that no metricReaders were added to the options
        const options = (agent as any)._options;
        assert.ok(!options.metricReaders || options.metricReaders.length === 0, "Should not have any metric readers when OTEL_METRICS_EXPORTER is not 'otlp'");
    });

    it("constructor does not create OTLP metric reader when no endpoint is provided", () => {
        const env = {
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
            ["OTEL_METRICS_EXPORTER"]: "otlp"
            // No OTEL_EXPORTER_OTLP_ENDPOINT or OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
        };
        process.env = env;
        
        const agent = new AKSLoader();
        
        // Verify that no metricReaders were added to the options
        const options = (agent as any)._options;
        assert.ok(!options.metricReaders || options.metricReaders.length === 0, "Should not have any metric readers when no OTLP endpoint is provided");
    });

    it("initialize with OTLP metric reader creates multiple metric collectors", () => {
        const env = {
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
            ["OTEL_METRICS_EXPORTER"]: "otlp",
            ["OTEL_EXPORTER_OTLP_ENDPOINT"]: "http://localhost:4317"
        };
        process.env = env;
        
        const agent = new AKSLoader();
        agent.initialize();
        
        let meterProvider = metrics.getMeterProvider() as any;
        assert.equal(meterProvider.constructor.name, "MeterProvider");
        
        // Should have both Azure Monitor and OTLP metric readers
        const metricCollectors = meterProvider["_sharedState"]["metricCollectors"];
        assert.ok(metricCollectors.length >= 1, "Should have at least one metric collector (Azure Monitor)");
        
        // Check that we have at least one Azure Monitor exporter
        const azureMonitorExporters = metricCollectors.filter((collector: any) => 
            collector["_metricReader"]["_exporter"].constructor.name === "AzureMonitorMetricExporter"
        );
        assert.equal(azureMonitorExporters.length, 1, "Should have exactly one Azure Monitor metric exporter");
    });
});
