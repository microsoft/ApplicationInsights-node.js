// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import * as assert from "assert";
import * as nock from "nock";
import * as sinon from "sinon";
import { Context, ProxyTracerProvider, trace, metrics, diag } from "@opentelemetry/api";
import { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { DependencyTelemetry, RequestTelemetry } from "../../../src/declarations/contracts";
import { TelemetryClient } from "../../../src/shim/telemetryClient";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { AzureMonitorExporterOptions, AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
import { MeterProvider, PeriodicExportingMetricReader, PeriodicExportingMetricReaderOptions, ResourceMetrics } from "@opentelemetry/sdk-metrics";
import { LogRecord, LogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { logs } from "@opentelemetry/api-logs";
import { SEMATTRS_RPC_SYSTEM } from "@opentelemetry/semantic-conventions";
import Config = require("../../../src/shim/shim-config");

describe("shim/TelemetryClient", () => {
    let client: TelemetryClient;
    let testProcessor: TestSpanProcessor;
    let tracerProvider: NodeTracerProvider;
    let loggerProvider: LoggerProvider;
    let testMetrics: ResourceMetrics;
    let metricProvider: MeterProvider;
    let logProcessor: TestLogProcessor;
    let sandbox: sinon.SinonSandbox;
    let diagErrorStub: sinon.SinonStub;
    let diagWarnStub: sinon.SinonStub;

    before(() => {
        sandbox = sinon.createSandbox();
        trace.disable();
        metrics.disable();
        nock("https://dc.services.visualstudio.com")
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

    beforeEach(() => {
        diagErrorStub = sandbox.stub(diag, 'error');
        diagWarnStub = sandbox.stub(diag, 'warn');
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

    describe("#unsupported and deprecated methods", () => {
        it("track throws error", () => {
            assert.throws(() => {
                client.track({ name: "test" } as any, "Event" as any);
            }, /Not implemented/);
        });
        
        it("addTelemetryProcessor should warn", () => {
            client.addTelemetryProcessor(() => true);
            assert.ok(diagWarnStub.calledOnce);
        });

        it("getAuthorizationHandler should warn", () => {
            client.getAuthorizationHandler(new Config());
            assert.ok(diagWarnStub.calledOnce);
        });

        it("setAutoPopulateAzureProperties should do nothing", () => {
            // This is a no-op, so just verify it doesn't throw
            assert.doesNotThrow(() => {
                client.setAutoPopulateAzureProperties();
            });
        });

        it("getStatsbeat should return null", () => {
            const result = client.getStatsbeat();
            assert.strictEqual(result, null);
        });
        
        it("setUseDiskRetryCaching throws error", () => {
            assert.throws(() => {
                client.setUseDiskRetryCaching(true);
            }, /Not implemented/);
        });

        it("clearTelemetryProcessors throws error", () => {
            assert.throws(() => {
                client.clearTelemetryProcessors();
            }, /Not implemented/);
        });

        it("trackNodeHttpRequestSync should warn", () => {
            client.trackNodeHttpRequestSync({} as any);
            assert.ok(diagWarnStub.calledOnce);
            assert.ok(diagWarnStub.calledWith("trackNodeHttpRequestSync is not implemented and is a no-op. Please use trackRequest instead."));
        });

        it("trackNodeHttpRequest should warn", () => {
            client.trackNodeHttpRequest({} as any);
            assert.ok(diagWarnStub.calledOnce);
            assert.ok(diagWarnStub.calledWith("trackNodeHttpRequest is not implemented and is a no-op. Please use trackRequest instead."));
        });

        it("trackNodeHttpDependency should warn", () => {
            client.trackNodeHttpDependency({} as any);
            assert.ok(diagWarnStub.calledOnce);
            assert.ok(diagWarnStub.calledWith("trackNodeHttpDependency is not implemented and is a no-op. Please use trackDependency instead."));
        });
    });

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
            assert.equal(spans[0].attributes[SEMATTRS_RPC_SYSTEM], "RPC");
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

        it("trackRequest with HTTP method in name", async () => {
            const telemetry: RequestTelemetry = {
                id: "7d2b68c6-5b3d-479d-92f9-ab680847acfd",
                name: "GET /",
                duration: 6,
                resultCode: "304",
                url: "http://localhost:4001/",
                success: false,
            };
            client.trackRequest(telemetry);
            await tracerProvider.forceFlush();
            const spans = testProcessor.spansProcessed;
            assert.equal(spans.length, 1);
            assert.equal(spans[0].name, "GET /");
            assert.equal(spans[0].kind, 1, "Span Kind"); // Incoming
            // HTTP method should be extracted from name, not hardcoded as "HTTP"
            assert.equal(spans[0].attributes["http.method"], "GET");
            assert.equal(spans[0].attributes["http.status_code"], "304");
            assert.equal(spans[0].attributes["http.url"], "http://localhost:4001/");
            // User-provided ID should be preserved
            assert.equal(spans[0].attributes["request.id"], "7d2b68c6-5b3d-479d-92f9-ab680847acfd");
        });

        it("trackRequest with different HTTP methods", async () => {
            const testCases = [
                { name: "POST /api/users", expectedMethod: "POST" },
                { name: "PUT /api/users/123", expectedMethod: "PUT" },
                { name: "DELETE /api/users/123", expectedMethod: "DELETE" },
                { name: "PATCH /api/users/123", expectedMethod: "PATCH" },
                { name: "HEAD /health", expectedMethod: "HEAD" },
                { name: "OPTIONS /api", expectedMethod: "OPTIONS" },
            ];

            for (let i = 0; i < testCases.length; i++) {
                const testCase = testCases[i];
                const telemetry: RequestTelemetry = {
                    id: `test-id-${i}`,
                    name: testCase.name,
                    duration: 100,
                    resultCode: "200",
                    url: "http://test.com",
                    success: true,
                };
                client.trackRequest(telemetry);
            }
            
            await tracerProvider.forceFlush();
            const spans = testProcessor.spansProcessed;
            assert.equal(spans.length, testCases.length);
            
            for (let i = 0; i < testCases.length; i++) {
                assert.equal(spans[i].attributes["http.method"], testCases[i].expectedMethod);
                assert.equal(spans[i].attributes["request.id"], `test-id-${i}`);
            }
        });

        it("trackRequest with non-HTTP method name fallback", async () => {
            const telemetry: RequestTelemetry = {
                id: "fallback-test",
                name: "Custom Operation Name",
                duration: 50,
                resultCode: "200",
                url: "http://test.com",
                success: true,
            };
            client.trackRequest(telemetry);
            await tracerProvider.forceFlush();
            const spans = testProcessor.spansProcessed;
            assert.equal(spans.length, 1);
            assert.equal(spans[0].name, "Custom Operation Name");
            // Should fallback to "HTTP" when no method pattern found
            assert.equal(spans[0].attributes["http.method"], "HTTP");
            assert.equal(spans[0].attributes["request.id"], "fallback-test");
        });

        it("trackRequest without ID should not add request.id attribute", async () => {
            const telemetry: RequestTelemetry = {
                name: "GET /test",
                duration: 50,
                resultCode: "200",
                url: "http://test.com",
                success: true,
            };
            client.trackRequest(telemetry);
            await tracerProvider.forceFlush();
            const spans = testProcessor.spansProcessed;
            assert.equal(spans.length, 1);
            assert.equal(spans[0].attributes["http.method"], "GET");
            // Should not have request.id attribute when not provided
            assert.equal(spans[0].attributes["request.id"], undefined);
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
        
        it("trackMetric should handle errors gracefully", async () => {
            const telemetry = {
                name: "ErrorMetric",
                value: 50,
            };
            
            // Force an error by stubbing metrics.getMeterProvider().getMeter()
            const error = new Error("Failed to get meter");
            const getMeterStub = sandbox.stub(metrics.getMeterProvider(), 'getMeter').throws(error);
            
            // This should now throw an error internally, but the method should catch it
            client.trackMetric(telemetry);
            
            // Verify the error was logged
            assert.ok(diagErrorStub.calledOnce);
            assert.ok(diagErrorStub.calledWith(`Failed to record metric: ${error}`));
            
            // Restore the stub
            getMeterStub.restore();
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