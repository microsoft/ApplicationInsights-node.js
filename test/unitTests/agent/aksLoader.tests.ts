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
});
