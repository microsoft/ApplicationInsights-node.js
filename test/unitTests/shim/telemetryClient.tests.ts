// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import * as assert from "assert";
import * as nock from "nock";
import * as sinon from "sinon";
import { Context, ProxyTracerProvider, trace, metrics } from "@opentelemetry/api";
import { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { DependencyTelemetry, RequestTelemetry } from "../../../src/declarations/contracts";
import { TelemetryClient } from "../../../src/shim/telemetryClient";
import { DEFAULT_BREEZE_ENDPOINT } from "../../../src/declarations/constants";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { AzureMonitorExporterOptions, AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
import { MeterProvider, PeriodicExportingMetricReader, PeriodicExportingMetricReaderOptions, ResourceMetrics } from "@opentelemetry/sdk-metrics";
import { LogRecord, LogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { logs } from "@opentelemetry/api-logs";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";

describe("shim/TelemetryClient", () => {
    let client: TelemetryClient;
    let testProcessor: TestSpanProcessor;
    let tracerProvider: NodeTracerProvider;
    let loggerProvider: LoggerProvider;
    let testMetrics: ResourceMetrics;
    let metricProvider: MeterProvider;
    let logProcessor: TestLogProcessor;
    let sandbox: sinon.SinonSandbox;

    before(() => {
        sandbox = sinon.createSandbox();
        trace.disable();
        metrics.disable();
        nock(DEFAULT_BREEZE_ENDPOINT)
            .post("/v2.1/track", (body: string) => true)
            .reply(200, {})
            .persist();
        nock.disableNetConnect();

        client = new TelemetryClient(
            "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"
        );
        client.config.samplingPercentage = 100;
        client.config.noDiagnosticChannel = true;
        client.initialize();
        tracerProvider = ((trace.getTracerProvider() as ProxyTracerProvider).getDelegate() as NodeTracerProvider);
        testProcessor = new TestSpanProcessor();
        tracerProvider.addSpanProcessor(testProcessor);

        loggerProvider = logs.getLoggerProvider() as LoggerProvider;
        logProcessor = new TestLogProcessor({});
        loggerProvider.addLogRecordProcessor(logProcessor);

        metricProvider = metrics.getMeterProvider() as MeterProvider;
    });

    afterEach(() => {
        sandbox.restore();
        testProcessor.spansProcessed = [];
    });


    after(() => {
        nock.cleanAll();
        nock.enableNetConnect();
        client.shutdown();
    });

    class TestSpanProcessor implements SpanProcessor {
        public spansProcessed: Array<ReadableSpan> = [];

        forceFlush(): Promise<void> {
            return Promise.resolve();
        }
        onStart(span: Span, parentContext: Context): void {
        }
        onEnd(span: ReadableSpan): void {
            this.spansProcessed.push(span);
        }
        shutdown(): Promise<void> {
            return Promise.resolve();
        }
    }

    class TestLogProcessor implements LogRecordProcessor {
        private _attributes: { [key: string]: string };
        constructor(attributes: { [key: string]: string }) {
            this._attributes = attributes;
        }
        
        // Override onEmit to apply log record attributes before exporting
        onEmit(record: LogRecord) {
            record.setAttributes(this._attributes);
        }
    
        shutdown(): Promise<void> {
            return Promise.resolve();
        }
    
        forceFlush(): Promise<void> {
            return Promise.resolve();
        }
    }

    class TestExporter extends AzureMonitorMetricExporter {
        constructor(options: AzureMonitorExporterOptions = {}) {
            super(options);
        }
        async export(
            metrics: ResourceMetrics,
        ): Promise<void> {
            testMetrics = metrics;
        }
    }

    describe("#manual track APIs", () => {
        it("trackDependency http", async () => {
            const telemetry: DependencyTelemetry = {
                name: "TestName",
                duration: 2000, //2 seconds
                resultCode: "401",
                data: "http://test.com",
                dependencyTypeName: "HTTP",
                target: "TestTarget",
                success: false,
            };
            client.trackDependency(telemetry);

            await tracerProvider.forceFlush();
            const spans = testProcessor.spansProcessed;
            assert.equal(spans.length, 1);
            assert.equal(spans[0].name, "TestName");
            assert.equal(spans[0].endTime[0] - spans[0].startTime[0], 2); // hrTime UNIX Epoch time in seconds
            assert.equal(spans[0].kind, 2, "Span Kind"); // Outgoing
            assert.equal(spans[0].attributes["http.status_code"], "401");
            assert.equal(spans[0].attributes["http.url"], "http://test.com");
            assert.equal(spans[0].attributes["peer.service"], "TestTarget");
        });

        it("trackDependency DB", async () => {
            const telemetry: DependencyTelemetry = {
                name: "TestName",
                duration: 2000, //2 seconds
                resultCode: "401",
                data: "SELECT * FROM test",
                dependencyTypeName: "MYSQL",
                target: "TestTarget",
                success: false,
            };
            client.trackDependency(telemetry);
            await tracerProvider.forceFlush();
            const spans = testProcessor.spansProcessed;
            assert.equal(spans.length, 1);
            assert.equal(spans[0].name, "TestName");
            assert.equal(spans[0].kind, 2, "Span Kind"); // Outgoing
            assert.equal(spans[0].attributes["db.system"], "MYSQL");
            assert.equal(spans[0].attributes["db.statement"], "SELECT * FROM test");
        });

        it("trackDependency RPC", async () => {
            const telemetry: DependencyTelemetry = {
                name: "TestName",
                duration: 2000, //2 seconds
                resultCode: "200",
                data: "SELECT * FROM test",
                dependencyTypeName: "RPC",
                target: "TestTarget",
                success: false,
            };
            client.trackDependency(telemetry);
            await tracerProvider.forceFlush();
            const spans = testProcessor.spansProcessed;
            assert.equal(spans.length, 1);
            assert.equal(spans[0].name, "TestName");
            assert.equal(spans[0].attributes[SemanticAttributes.RPC_SYSTEM], "RPC");
        });

        it("trackRequest", async () => {
            const telemetry: RequestTelemetry = {
                id: "123456",
                name: "TestName",
                duration: 2000, //2 seconds
                resultCode: "401",
                url: "http://test.com",
                success: false,
            };
            client.trackRequest(telemetry);
            await tracerProvider.forceFlush();
            const spans = testProcessor.spansProcessed;
            assert.equal(spans.length, 1);
            assert.equal(spans[0].name, "TestName");
            assert.equal(spans[0].endTime[0] - spans[0].startTime[0], 2); // hrTime UNIX Epoch time in seconds
            assert.equal(spans[0].kind, 1, "Span Kind"); // Incoming
            assert.equal(spans[0].attributes["http.method"], "HTTP");
            assert.equal(spans[0].attributes["http.status_code"], "401");
            assert.equal(spans[0].attributes["http.url"], "http://test.com");
        });

        it("trackMetric", async () => {
            const telemetry = {
                name: "TestName",
                value: 100,
            };
            const exporter = new TestExporter({ connectionString: "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3330;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/" });
            const metricReaderOptions: PeriodicExportingMetricReaderOptions = {
                exporter: exporter,
            };
            const metricReader = new PeriodicExportingMetricReader(metricReaderOptions);
            metricProvider.addMetricReader(metricReader);
            client.trackMetric(telemetry);
            metricProvider.forceFlush();
            await new Promise((resolve) => setTimeout(resolve, 800));
            assert.equal(testMetrics.scopeMetrics[0].metrics[0].descriptor.name, "TestName");
            assert.equal(testMetrics.scopeMetrics[0].metrics[0].descriptor.type, "HISTOGRAM");
            // @ts-ignore: TypeScript is not aware of the sum existing on the value object since it's a generic type
            assert.equal(testMetrics.scopeMetrics[0].metrics[0].dataPoints[0].value.sum, 100);
        });
        
        it("trackAvailability", async () => {
            const stub = sandbox.stub(logProcessor, "onEmit");
            const telemetry = {
                id: "123456",
                name: "TestName",
                duration: 2000, // 2 seconds
                success: true,
                runLocation: "TestLocation",
                message: "TestMessage"
            };
            client.trackAvailability(telemetry);
            await loggerProvider.forceFlush();
            await new Promise((resolve) => setTimeout(resolve, 800));
            assert.ok(stub.calledOnce);
        });

        it("trackPageView", async () => {
            const stub = sandbox.stub(logProcessor, "onEmit");
            const telemetry = {
                id: "123456",
                name: "TestName",
                url: "http://test.com",
            };
            client.trackPageView(telemetry);
            await loggerProvider.forceFlush();
            await new Promise((resolve) => setTimeout(resolve, 800));
            assert.ok(stub.calledOnce);
        });
        
        it("trackEvent", async () => {
            const stub = sandbox.stub(logProcessor, "onEmit");
            const telemetry = {
                name: "TestName",
            };
            client.trackEvent(telemetry);
            await loggerProvider.forceFlush();
            await new Promise((resolve) => setTimeout(resolve, 800));
            assert.ok(stub.calledOnce);
        });

        it("trackTrace", async () => {
            const stub = sandbox.stub(logProcessor, "onEmit");
            const telemetry = {
                message: "test message",
            };
            client.trackTrace(telemetry);
            await loggerProvider.forceFlush();
            await new Promise((resolve) => setTimeout(resolve, 800));
            assert.ok(stub.calledOnce);
        });

        it("trackException", async () => {
            const stub = sandbox.stub(logProcessor, "onEmit");
            const telemetry = {
                exception: new Error("test error"),
            };
            client.trackException(telemetry);
            await loggerProvider.forceFlush();
            await new Promise((resolve) => setTimeout(resolve, 800));
            assert.ok(stub.calledOnce);
        });
    });
});