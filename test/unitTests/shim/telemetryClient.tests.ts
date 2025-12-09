// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import * as assert from "assert";
import * as nock from "nock";
import * as sinon from "sinon";
import { Context, diag } from "@opentelemetry/api";
import { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { LogRecord, LogRecordProcessor } from "@opentelemetry/sdk-logs";
import { SEMATTRS_RPC_SYSTEM } from "@opentelemetry/semantic-conventions";
import { DependencyTelemetry, RequestTelemetry } from "../../../src/declarations/contracts";
import { TelemetryClient } from "../../../src/shim/telemetryClient";
import * as main from "../../../src/main";
import Config = require("../../../src/shim/shim-config");

describe("shim/TelemetryClient", () => {
    let client: TelemetryClient;
    let testProcessor: TestSpanProcessor;
    let logProcessor: TestLogProcessor;
    let sandbox: sinon.SinonSandbox;
    let diagErrorStub: sinon.SinonStub;
    let diagWarnStub: sinon.SinonStub;

    before(() => {
        sandbox = sinon.createSandbox();
        nock("https://dc.services.visualstudio.com")
            .post("/v2.1/track", (body: string) => true)
            .reply(200, {})
            .persist();
        nock.disableNetConnect();
        testProcessor = new TestSpanProcessor();
        logProcessor = new TestLogProcessor({});

        client = new TelemetryClient(
            "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"
        );
        client.config.samplingPercentage = 100;
        client.config.noDiagnosticChannel = true;
        client.config.azureMonitorOpenTelemetryOptions = {
            spanProcessors: [testProcessor],
            logRecordProcessors: [logProcessor]
        };
        client.initialize();
    });

    beforeEach(() => {
        diagErrorStub = sandbox.stub(diag, 'error');
        diagWarnStub = sandbox.stub(diag, 'warn');
    });

    afterEach(() => {
        sandbox.restore();
        testProcessor.spansProcessed = [];
    });


    after(async () => {
        nock.cleanAll();
        nock.enableNetConnect();
        await client.shutdown();
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
            const spans = testProcessor.spansProcessed;
            assert.equal(spans.length, 1);
            assert.equal(spans[0].name, "TestName");
            assert.equal(spans[0].endTime[0] - spans[0].startTime[0], 2); // hrTime UNIX Epoch time in seconds
            assert.equal(spans[0].kind, 1, "Span Kind"); // Incoming
            assert.equal(spans[0].attributes["http.method"], "HTTP");
            assert.equal(spans[0].attributes["http.status_code"], "401");
            assert.equal(spans[0].attributes["http.url"], "http://test.com");
        });

        it("trackMetric", () => {
            const telemetry = {
                name: "TestName",
                value: 100,
                properties: { custom: "value" }
            };
            client.commonProperties = { common: "prop" };
            client.context.tags = { tag: "value" } as any;
            const histogramRecord = sandbox.stub();
            const meterMock = {
                createHistogram: sandbox.stub().returns({
                    record: histogramRecord,
                })
            };
            (client as any)._manualMeter = undefined;
            const pipeline = (client as any)._pipeline;
            const getMeterStub = sandbox.stub(pipeline, "getMeter").returns(meterMock);

            client.trackMetric(telemetry);

            assert.ok(histogramRecord.calledOnce);
            assert.strictEqual(histogramRecord.firstCall.args[0], telemetry.value);
            assert.deepStrictEqual(histogramRecord.firstCall.args[1], {
                ...telemetry.properties,
                ...client.commonProperties,
                ...client.context.tags
            });

            getMeterStub.restore();
        });
        
        it("trackMetric should handle errors gracefully", () => {
            const telemetry = {
                name: "ErrorMetric",
                value: 50,
            };
            
            // Force an error by stubbing the isolated meter provider
            const error = new Error("Failed to get meter");
            (client as any)._manualMeter = undefined;
            const pipeline = (client as any)._pipeline;
            const getMeterStub = sandbox.stub(pipeline, "getMeter").throws(error);
            
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
            assert.ok(stub.calledOnce);
        });
        
        it("trackEvent", async () => {
            const stub = sandbox.stub(logProcessor, "onEmit");
            const telemetry = {
                name: "TestName",
            };
            client.trackEvent(telemetry);
            assert.ok(stub.calledOnce);
        });

        it("trackTrace", async () => {
            const stub = sandbox.stub(logProcessor, "onEmit");
            const telemetry = {
                message: "test message",
            };
            client.trackTrace(telemetry);
            assert.ok(stub.calledOnce);
        });

        it("trackException", async () => {
            const stub = sandbox.stub(logProcessor, "onEmit");
            const telemetry = {
                exception: new Error("test error"),
            };
            client.trackException(telemetry);
            assert.ok(stub.calledOnce);
        });
    });

    describe("initialization modes", () => {
        it("does not call useAzureMonitor for isolated clients", async () => {
            const useAzureMonitorStub = sandbox.stub(main, "useAzureMonitor");
            const isolatedClient = new TelemetryClient(
                "InstrumentationKey=11111111-bbbb-1ccc-8ddd-eeeeffff3334"
            );
            isolatedClient.initialize();
            assert.ok(useAzureMonitorStub.notCalled);
            await isolatedClient.shutdown();
        });

        it("uses global telemetry pipeline when requested", async () => {
            const useAzureMonitorStub = sandbox.stub(main, "useAzureMonitor");
            const shutdownStub = sandbox.stub(main, "shutdownAzureMonitor").resolves();
            const globalClient = new TelemetryClient(
                "InstrumentationKey=11111111-bbbb-1ccc-8ddd-eeeeffff3335",
                { useGlobalProviders: true }
            );
            globalClient.initialize();
            assert.ok(useAzureMonitorStub.calledOnce);
            await globalClient.shutdown();
            assert.ok(shutdownStub.calledOnce);
        });
    });
});