import * as assert from "assert";
import * as sinon from "sinon";
import { ProxyTracerProvider, metrics, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";

import { AKSLoader } from "../../../src/agent/aksLoader";
import { DiagnosticLogger } from "../../../src/agent/diagnostics/diagnosticLogger";
import { FileWriter } from "../../../src/agent/diagnostics/writers/fileWriter";

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
        // Prefix Env variable should be set
        assert.equal(process.env["AZURE_MONITOR_AUTO_ATTACH"], "true");
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
        assert.equal(tracerProvider["_registeredSpanProcessors"][0]["_exporter"].constructor.name, "AzureMonitorTraceExporter");
        let loggerProvider = logs.getLoggerProvider() as any;
        assert.equal(loggerProvider.constructor.name, "LoggerProvider");
        assert.equal(loggerProvider["_sharedState"]["registeredLogRecordProcessors"][0]["_exporter"].constructor.name, "AzureMonitorLogExporter");
    });

    it("should add OTLP exporter if env variable is present", () => {
        const env = {
            ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
            ["OTEL_EXPORTER_OTLP_METRICS_ENDPOINT"]: "something",
        };
        process.env = env;
        const agent = new AKSLoader();
        agent.initialize();
        let meterProvider = metrics.getMeterProvider() as any;
        assert.equal(meterProvider.constructor.name, "MeterProvider");
        assert.equal(meterProvider["_sharedState"]["metricCollectors"].length, 2);
        assert.equal(meterProvider["_sharedState"]["metricCollectors"][1]["_metricReader"]["_exporter"].constructor.name, "OTLPMetricExporter");
    });
});
