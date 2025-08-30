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

    describe("OTEL environment variable handling", () => {
        it("should remove OTEL_TRACES_EXPORTER and OTEL_LOGS_EXPORTER during initialization", () => {
            const env = {
                ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
                ["OTEL_TRACES_EXPORTER"]: "jaeger",
                ["OTEL_LOGS_EXPORTER"]: "console"
            };
            process.env = env;

            const agent = new AKSLoader();
            
            // Spy on the parent initialize method to check environment during call
            let envDuringParentCall: { traces?: string; logs?: string } = {};
            const originalInitialize = Object.getPrototypeOf(Object.getPrototypeOf(agent)).initialize;
            const parentInitializeSpy = sandbox.stub(Object.getPrototypeOf(Object.getPrototypeOf(agent)), 'initialize').callsFake(function() {
                envDuringParentCall.traces = process.env.OTEL_TRACES_EXPORTER;
                envDuringParentCall.logs = process.env.OTEL_LOGS_EXPORTER;
                return originalInitialize.call(this);
            });

            agent.initialize();

            // Verify that environment variables were undefined during parent initialize call
            assert.strictEqual(envDuringParentCall.traces, undefined, "OTEL_TRACES_EXPORTER should be undefined during parent initialize");
            assert.strictEqual(envDuringParentCall.logs, undefined, "OTEL_LOGS_EXPORTER should be undefined during parent initialize");

            // Verify parent initialize was called
            assert.ok(parentInitializeSpy.calledOnce, "Parent initialize should be called once");

            parentInitializeSpy.restore();
        });

        it("should restore OTEL_TRACES_EXPORTER and OTEL_LOGS_EXPORTER after initialization", () => {
            const env = {
                ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
                ["OTEL_TRACES_EXPORTER"]: "jaeger",
                ["OTEL_LOGS_EXPORTER"]: "console"
            };
            process.env = env;

            const agent = new AKSLoader();
            agent.initialize();

            // Verify environment variables are restored after initialization
            assert.strictEqual(process.env.OTEL_TRACES_EXPORTER, "jaeger", "OTEL_TRACES_EXPORTER should be restored");
            assert.strictEqual(process.env.OTEL_LOGS_EXPORTER, "console", "OTEL_LOGS_EXPORTER should be restored");
        });

        it("should handle cases where OTEL environment variables are not set", () => {
            const env = {
                ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"
                // OTEL variables intentionally not set
            };
            process.env = env;

            const agent = new AKSLoader();
            agent.initialize();

            // Verify that undefined variables remain undefined
            assert.strictEqual(process.env.OTEL_TRACES_EXPORTER, undefined, "OTEL_TRACES_EXPORTER should remain undefined");
            assert.strictEqual(process.env.OTEL_LOGS_EXPORTER, undefined, "OTEL_LOGS_EXPORTER should remain undefined");
        });

        it("should restore environment variables even if parent initialize throws", () => {
            const env = {
                ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
                ["OTEL_TRACES_EXPORTER"]: "jaeger",
                ["OTEL_LOGS_EXPORTER"]: "console"
            };
            process.env = env;

            const agent = new AKSLoader();
            
            // Stub parent initialize to throw an error
            const parentInitializeStub = sandbox.stub(Object.getPrototypeOf(Object.getPrototypeOf(agent)), 'initialize').throws(new Error("Test error"));

            try {
                agent.initialize();
                assert.fail("Expected initialize to throw an error");
            } catch (error: any) {
                assert.strictEqual(error.message, "Test error", "Should propagate the error from parent initialize");
            }

            // Verify environment variables are still restored despite the error
            assert.strictEqual(process.env.OTEL_TRACES_EXPORTER, "jaeger", "OTEL_TRACES_EXPORTER should be restored even after error");
            assert.strictEqual(process.env.OTEL_LOGS_EXPORTER, "console", "OTEL_LOGS_EXPORTER should be restored even after error");

            parentInitializeStub.restore();
        });

        it("should handle partial environment variable sets correctly", () => {
            const env = {
                ["APPLICATIONINSIGHTS_CONNECTION_STRING"]: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333",
                ["OTEL_TRACES_EXPORTER"]: "jaeger"
                // OTEL_LOGS_EXPORTER intentionally not set
            };
            process.env = env;

            const agent = new AKSLoader();
            agent.initialize();

            // Verify that only the set variable is restored
            assert.strictEqual(process.env.OTEL_TRACES_EXPORTER, "jaeger", "OTEL_TRACES_EXPORTER should be restored");
            assert.strictEqual(process.env.OTEL_LOGS_EXPORTER, undefined, "OTEL_LOGS_EXPORTER should remain undefined");
        });
    });
});
