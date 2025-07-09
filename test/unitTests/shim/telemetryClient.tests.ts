// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import assert from "assert";
import nock = require("nock");
import sinon from "sinon";
import { Context, ProxyTracerProvider, trace, metrics, diag } from "@opentelemetry/api";
import { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { DependencyTelemetry, RequestTelemetry } from "../../../src/declarations/contracts";
import { TelemetryClient } from "../../../src/shim/telemetryClient";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { AzureMonitorExporterOptions, AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
import { MeterProvider, PeriodicExportingMetricReader, PeriodicExportingMetricReaderOptions, ResourceMetrics, PushMetricExporter } from "@opentelemetry/sdk-metrics";
import { LogRecord, LogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { logs } from "@opentelemetry/api-logs";
import { SEMATTRS_RPC_SYSTEM } from "@opentelemetry/semantic-conventions";
import Config = require("../../../src/shim/shim-config");
import { getExtensibleSpanProcessor, getExtensibleLogRecordProcessor } from "../../../src/main";

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
        // Use our extensible processor to add the test processor
        const extensibleProcessor = getExtensibleSpanProcessor();
        if (extensibleProcessor) {
            extensibleProcessor.addSpanProcessor(testProcessor);
        } else {
            // Fallback: In OpenTelemetry 2.x, addSpanProcessor was removed, so we access the internal array directly
            if ((tracerProvider as any)._registeredSpanProcessors) {
                (tracerProvider as any)._registeredSpanProcessors.unshift(testProcessor);
            }
        }

        loggerProvider = logs.getLoggerProvider() as LoggerProvider;
        logProcessor = new TestLogProcessor({});
        // Use our extensible processor to add the test processor
        const extensibleLogProcessor = getExtensibleLogRecordProcessor();
        if (extensibleLogProcessor) {
            extensibleLogProcessor.addLogRecordProcessor(logProcessor);
        } else {
            // Fallback to direct addition
            loggerProvider.addLogRecordProcessor(logProcessor);
        }

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

    class TestExporter implements PushMetricExporter {
        constructor() {
        }
        async export(
            metrics: ResourceMetrics,
        ): Promise<void> {
            console.log("TestExporter.export called with:", JSON.stringify(metrics, null, 2));
            testMetrics = metrics;
            return Promise.resolve();
        }
        
        async forceFlush(): Promise<void> {
            return Promise.resolve();
        }
        
        async shutdown(): Promise<void> {
            return Promise.resolve();
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

        it("trackDependency default timing - should treat current time as end time", async () => {
            const beforeCall = Date.now();
            const telemetry: DependencyTelemetry = {
                name: "TestTimingDependency",
                duration: 1000, // 1 second
                resultCode: "200",
                data: "http://api.example.com",
                dependencyTypeName: "HTTP",
                success: true,
            };
            // Call trackDependency without specifying 'time' - should default to current time as END time
            client.trackDependency(telemetry);
            const afterCall = Date.now();
            
            await tracerProvider.forceFlush();
            const spans = testProcessor.spansProcessed;
            assert.equal(spans.length, 1);
            assert.equal(spans[0].name, "TestTimingDependency");
            
            // Convert span times from hrTime to milliseconds for comparison
            const spanStartMs = spans[0].startTime[0] * 1000 + spans[0].startTime[1] / 1_000_000;
            const spanEndMs = spans[0].endTime[0] * 1000 + spans[0].endTime[1] / 1_000_000;
            
            // Duration should match the specified duration
            const actualDuration = spanEndMs - spanStartMs;
            assert.ok(Math.abs(actualDuration - 1000) < 10, `Expected duration ~1000ms, got ${actualDuration}ms`);
            
            // End time should be close to when we called trackDependency (within reasonable tolerance)
            assert.ok(spanEndMs >= beforeCall && spanEndMs <= afterCall + 50, 
                `End time ${spanEndMs} should be between ${beforeCall} and ${afterCall + 50}`);
            
            // Start time should be approximately end time minus duration
            const expectedStartMs = spanEndMs - 1000;
            assert.ok(Math.abs(spanStartMs - expectedStartMs) < 10, 
                `Start time ${spanStartMs} should be close to ${expectedStartMs}`);
        });

        it("trackDependency with custom time - should respect provided start time", async () => {
            const customStartTime = new Date(Date.now() - 5000); // 5 seconds ago
            const telemetry: DependencyTelemetry = {
                name: "CustomTimeDependency",
                duration: 2000, // 2 seconds
                resultCode: "200",
                data: "http://custom.example.com",
                dependencyTypeName: "HTTP",
                success: true,
                time: customStartTime
            };
            
            client.trackDependency(telemetry);
            
            await tracerProvider.forceFlush();
            const spans = testProcessor.spansProcessed;
            assert.equal(spans.length, 1);
            assert.equal(spans[0].name, "CustomTimeDependency");
            
            // Convert span times from hrTime to milliseconds for comparison
            const spanStartMs = spans[0].startTime[0] * 1000 + spans[0].startTime[1] / 1_000_000;
            const spanEndMs = spans[0].endTime[0] * 1000 + spans[0].endTime[1] / 1_000_000;
            
            // Duration should match the specified duration
            const actualDuration = spanEndMs - spanStartMs;
            assert.ok(Math.abs(actualDuration - 2000) < 10, `Expected duration ~2000ms, got ${actualDuration}ms`);
            
            // Start time should match the custom time provided
            assert.ok(Math.abs(spanStartMs - customStartTime.getTime()) < 10, 
                `Start time ${spanStartMs} should be close to custom time ${customStartTime.getTime()}`);
            
            // End time should be start time plus duration
            const expectedEndMs = customStartTime.getTime() + 2000;
            assert.ok(Math.abs(spanEndMs - expectedEndMs) < 10, 
                `End time ${spanEndMs} should be close to ${expectedEndMs}`);
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
            assert.equal(spans[0].attributes["http.status_code"], "401");
            assert.equal(spans[0].attributes["http.url"], "http://test.com");
        });

        it("trackRequest with custom id sets traceId", async () => {
            const customId = "custom-trace-id-123456789abcdef0";
            const telemetry: RequestTelemetry = {
                id: customId,
                name: "CustomTraceRequest",
                duration: 1000,
                resultCode: "200",
                url: "http://example.com",
                success: true,
            };
            client.trackRequest(telemetry);
            await tracerProvider.forceFlush();
            const spans = testProcessor.spansProcessed;
            assert.equal(spans.length, 1);
            assert.equal(spans[0].name, "CustomTraceRequest");
            // Verify that the span's traceId matches the custom id provided
            assert.equal(spans[0].spanContext().traceId, customId);
        });

        it("trackRequest default timing - should treat current time as end time", async () => {
            const beforeCall = Date.now();
            const telemetry: RequestTelemetry = {
                name: "TestTimingRequest",
                duration: 1500, // 1.5 seconds
                resultCode: "200",
                url: "http://api.example.com/users",
                success: true,
            };
            // Call trackRequest without specifying 'time' - should default to current time as END time
            client.trackRequest(telemetry);
            const afterCall = Date.now();
            
            await tracerProvider.forceFlush();
            const spans = testProcessor.spansProcessed;
            assert.equal(spans.length, 1);
            assert.equal(spans[0].name, "TestTimingRequest");
            
            // Convert span times from hrTime to milliseconds for comparison
            const spanStartMs = spans[0].startTime[0] * 1000 + spans[0].startTime[1] / 1_000_000;
            const spanEndMs = spans[0].endTime[0] * 1000 + spans[0].endTime[1] / 1_000_000;
            
            // Duration should match the specified duration
            const actualDuration = spanEndMs - spanStartMs;
            assert.ok(Math.abs(actualDuration - 1500) < 10, `Expected duration ~1500ms, got ${actualDuration}ms`);
            
            // End time should be close to when we called trackRequest (within reasonable tolerance)
            assert.ok(spanEndMs >= beforeCall && spanEndMs <= afterCall + 50, 
                `End time ${spanEndMs} should be between ${beforeCall} and ${afterCall + 50}`);
            
            // Start time should be calculated as end time - duration
            const expectedStartMs = spanEndMs - 1500;
            assert.ok(Math.abs(spanStartMs - expectedStartMs) < 10, 
                `Start time ${spanStartMs} should be close to ${expectedStartMs}`);
        });

        it("trackRequest with custom time - should respect provided start time", async () => {
            const customStartTime = new Date(Date.now() - 3000); // 3 seconds ago
            const telemetry: RequestTelemetry = {
                name: "CustomTimeRequest",
                duration: 1200, // 1.2 seconds
                resultCode: "201",
                url: "http://custom.example.com/data",
                success: true,
                time: customStartTime
            };
            
            client.trackRequest(telemetry);
            
            await tracerProvider.forceFlush();
            const spans = testProcessor.spansProcessed;
            assert.equal(spans.length, 1);
            assert.equal(spans[0].name, "CustomTimeRequest");
            
            // Convert span times from hrTime to milliseconds for comparison
            const spanStartMs = spans[0].startTime[0] * 1000 + spans[0].startTime[1] / 1_000_000;
            const spanEndMs = spans[0].endTime[0] * 1000 + spans[0].endTime[1] / 1_000_000;
            
            // Start time should match the provided custom time
            const expectedStartMs = customStartTime.getTime();
            assert.ok(Math.abs(spanStartMs - expectedStartMs) < 10, 
                `Start time ${spanStartMs} should be close to ${expectedStartMs}`);
            
            // End time should be start time + duration
            const expectedEndMs = customStartTime.getTime() + 1200;
            assert.ok(Math.abs(spanEndMs - expectedEndMs) < 10, 
                `End time ${spanEndMs} should be close to ${expectedEndMs}`);
        });

        it("trackDependency with custom id sets traceId", async () => {
            const customId = "custom-dependency-trace-id-abcdef";
            const telemetry: DependencyTelemetry = {
                id: customId,
                name: "CustomTraceDependency",
                duration: 500,
                resultCode: "200",
                data: "http://api.example.com",
                dependencyTypeName: "HTTP",
                target: "api.example.com",
                success: true,
            };
            client.trackDependency(telemetry);
            await tracerProvider.forceFlush();
            const spans = testProcessor.spansProcessed;
            assert.equal(spans.length, 1);
            assert.equal(spans[0].name, "CustomTraceDependency");
            // Verify that the span's traceId matches the custom id provided
            assert.equal(spans[0].spanContext().traceId, customId);
        });

        it("trackMetric", async () => {
            const telemetry = {
                name: "TestName",
                value: 100,
            };
            
            // Create spy on the histogram record method to verify metric tracking
            const originalMeter = metrics.getMeterProvider().getMeter("ApplicationInsightsMetrics");
            const histogramRecordSpy = sandbox.spy();
            
            // Mock the histogram creation to track record calls
            const histogramMock = {
                record: histogramRecordSpy
            };
            
            const createHistogramStub = sandbox.stub(originalMeter, 'createHistogram').returns(histogramMock as any);
            
            // Track the metric
            client.trackMetric(telemetry);
            
            // Verify that createHistogram was called with the correct name
            assert.ok(createHistogramStub.calledOnce, "createHistogram should be called once");
            assert.equal(createHistogramStub.args[0][0], "TestName", "Histogram should be created with correct name");
            
            // Verify that record was called with the correct value
            assert.ok(histogramRecordSpy.calledOnce, "Histogram record should be called once");
            assert.equal(histogramRecordSpy.args[0][0], 100, "Record should be called with correct value");
            
            // Verify properties were passed
            const recordedAttributes = histogramRecordSpy.args[0][1];
            assert.ok(recordedAttributes, "Attributes should be passed to record");
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

    describe("Instance count tracking and MULTI_IKEY statsbeat feature", () => {
        let originalEnv: NodeJS.ProcessEnv;

        beforeEach(() => {
            // Save original environment
            originalEnv = { ...process.env };
            // Clear the AZURE_MONITOR_STATSBEAT_FEATURES environment variable before each test
            delete process.env["AZURE_MONITOR_STATSBEAT_FEATURES"];
            // Reset the static instance count for testing
            (TelemetryClient as any)._instanceCount = 0;
        });

        afterEach(() => {
            // Restore original environment
            process.env = originalEnv;
        });

        it("should not enable MULTI_IKEY feature when creating first TelemetryClient instance", () => {
            const firstClient = new TelemetryClient("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            
            // Check statsbeat features environment variable
            const statsbeatFeatures = process.env["AZURE_MONITOR_STATSBEAT_FEATURES"];
            if (statsbeatFeatures) {
                const config = JSON.parse(statsbeatFeatures);
                // MULTI_IKEY bit should not be set (128)
                assert.strictEqual((config.feature & 128), 0, "MULTI_IKEY feature should not be enabled for first instance");
            }
            
            firstClient.shutdown();
        });

        it("should enable MULTI_IKEY feature when creating second TelemetryClient instance", () => {
            const firstClient = new TelemetryClient("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            
            // First instance should not have MULTI_IKEY feature enabled
            let statsbeatFeatures = process.env["AZURE_MONITOR_STATSBEAT_FEATURES"];
            if (statsbeatFeatures) {
                const config = JSON.parse(statsbeatFeatures);
                assert.strictEqual((config.feature & 128), 0, "MULTI_IKEY feature should not be enabled for first instance");
            }
            
            const secondClient = new TelemetryClient("InstrumentationKey=2bb22222-cccc-2ddd-9eee-fffff4444444");
            
            // Second instance should have MULTI_IKEY feature enabled
            statsbeatFeatures = process.env["AZURE_MONITOR_STATSBEAT_FEATURES"];
            assert.ok(statsbeatFeatures, "AZURE_MONITOR_STATSBEAT_FEATURES should be set");
            const config = JSON.parse(statsbeatFeatures);
            assert.strictEqual((config.feature & 128), 128, "MULTI_IKEY feature should be enabled for second instance");
            
            firstClient.shutdown();
            secondClient.shutdown();
        });

        it("should keep MULTI_IKEY feature enabled when creating additional TelemetryClient instances", () => {
            const firstClient = new TelemetryClient("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            const secondClient = new TelemetryClient("InstrumentationKey=2bb22222-cccc-2ddd-9eee-fffff4444444");
            
            let statsbeatFeatures = process.env["AZURE_MONITOR_STATSBEAT_FEATURES"];
            assert.ok(statsbeatFeatures, "AZURE_MONITOR_STATSBEAT_FEATURES should be set after second instance");
            let config = JSON.parse(statsbeatFeatures);
            assert.strictEqual((config.feature & 128), 128, "MULTI_IKEY feature should be enabled after second instance");
            
            const thirdClient = new TelemetryClient("InstrumentationKey=3cc33333-dddd-3eee-afff-ggggg5555555");
            
            statsbeatFeatures = process.env["AZURE_MONITOR_STATSBEAT_FEATURES"];
            assert.ok(statsbeatFeatures, "AZURE_MONITOR_STATSBEAT_FEATURES should remain set for third instance");
            config = JSON.parse(statsbeatFeatures);
            assert.strictEqual((config.feature & 128), 128, "MULTI_IKEY feature should remain enabled for third instance");
            
            firstClient.shutdown();
            secondClient.shutdown();
            thirdClient.shutdown();
        });

        it("should increment instance count correctly for multiple TelemetryClient instances", () => {
            const firstClient = new TelemetryClient("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            assert.strictEqual((TelemetryClient as any)._instanceCount, 1, "Instance count should be 1 after first client");
            
            const secondClient = new TelemetryClient("InstrumentationKey=2bb22222-cccc-2ddd-9eee-fffff4444444");
            assert.strictEqual((TelemetryClient as any)._instanceCount, 2, "Instance count should be 2 after second client");
            
            const thirdClient = new TelemetryClient("InstrumentationKey=3cc33333-dddd-3eee-afff-ggggg5555555");
            assert.strictEqual((TelemetryClient as any)._instanceCount, 3, "Instance count should be 3 after third client");
            
            firstClient.shutdown();
            secondClient.shutdown();
            thirdClient.shutdown();
        });

        it("should work with different connection strings", () => {
            const firstClient = new TelemetryClient("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/");
            
            let statsbeatFeatures = process.env["AZURE_MONITOR_STATSBEAT_FEATURES"];
            if (statsbeatFeatures) {
                const config = JSON.parse(statsbeatFeatures);
                assert.strictEqual((config.feature & 128), 0, "MULTI_IKEY feature should not be enabled for first instance with connection string");
            }
            
            const secondClient = new TelemetryClient("InstrumentationKey=2bb22222-cccc-2ddd-9eee-fffff4444444;IngestionEndpoint=https://westus-2.in.applicationinsights.azure.com/");
            
            statsbeatFeatures = process.env["AZURE_MONITOR_STATSBEAT_FEATURES"];
            assert.ok(statsbeatFeatures, "AZURE_MONITOR_STATSBEAT_FEATURES should be set");
            const config = JSON.parse(statsbeatFeatures);
            assert.strictEqual((config.feature & 128), 128, "MULTI_IKEY feature should be enabled for second instance with different connection string");
            
            firstClient.shutdown();
            secondClient.shutdown();
        });

        it("should work when no connection string is provided", () => {
            const firstClient = new TelemetryClient();
            assert.strictEqual((TelemetryClient as any)._instanceCount, 1, "Instance count should be 1 after first client with no connection string");
            
            let statsbeatFeatures = process.env["AZURE_MONITOR_STATSBEAT_FEATURES"];
            if (statsbeatFeatures) {
                const config = JSON.parse(statsbeatFeatures);
                assert.strictEqual((config.feature & 128), 0, "MULTI_IKEY feature should not be enabled for first instance with no connection string");
            }
            
            const secondClient = new TelemetryClient();
            assert.strictEqual((TelemetryClient as any)._instanceCount, 2, "Instance count should be 2 after second client with no connection string");
            
            statsbeatFeatures = process.env["AZURE_MONITOR_STATSBEAT_FEATURES"];
            assert.ok(statsbeatFeatures, "AZURE_MONITOR_STATSBEAT_FEATURES should be set");
            const config = JSON.parse(statsbeatFeatures);
            assert.strictEqual((config.feature & 128), 128, "MULTI_IKEY feature should be enabled for second instance with no connection string");
            
            firstClient.shutdown();
            secondClient.shutdown();
        });
    });
});