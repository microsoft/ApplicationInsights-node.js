import * as assert from "assert";
import * as nock from "nock";
import { Context, ProxyTracerProvider, trace, metrics } from "@opentelemetry/api";
import { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { DependencyTelemetry, RequestTelemetry } from "../../../src/declarations/contracts";
import { TelemetryClient } from "../../../src/shim/telemetryClient";
import { DEFAULT_BREEZE_ENDPOINT } from "../../../src/declarations/constants";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";


describe("shim/TelemetryClient", () => {
    let client: TelemetryClient;
    let testProcessor: TestSpanProcessor;
    let tracerProvider: NodeTracerProvider;

    before(() => {
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
        client.initialize();
        tracerProvider = ((trace.getTracerProvider() as ProxyTracerProvider).getDelegate() as NodeTracerProvider);
        testProcessor = new TestSpanProcessor();
        tracerProvider.addSpanProcessor(testProcessor);
    });

    afterEach(() => {
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
    });
});
