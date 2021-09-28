import assert = require("assert");
import sinon = require("sinon");
import { Span, BasicTracerProvider, TracerConfig } from "@opentelemetry/tracing";
import { Link, SpanKind, SpanContext, ROOT_CONTEXT, SpanStatus, SpanStatusCode } from "@opentelemetry/api";
import {
    SemanticAttributes,
    SemanticResourceAttributes
} from "@opentelemetry/semantic-conventions";

import AppInsights = require("../../applicationinsights");
import { spanToTelemetryContract } from "../../AutoCollection/diagnostic-channel/SpanParser";
import { DependencyTelemetry, Identified, RequestTelemetry } from "../../Declarations/Contracts";

describe("diagnostic-channel/azure-coretracing", () => {
    var sandbox: sinon.SinonSandbox;

    const tracer = new BasicTracerProvider().getTracer("default");

    before(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        AppInsights.dispose();
        sandbox.restore();
    });

    it("should populate HTTP dependency", () => {
        const span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.CLIENT,
            "parentSpanId"
        );
        span.attributes[SemanticAttributes.HTTP_METHOD] = "POST";
        span.attributes[SemanticAttributes.HTTP_STATUS_CODE] = "404";
        span.attributes[SemanticAttributes.HTTP_URL] = "http://test.com/path/";
        span.attributes[SemanticAttributes.PEER_SERVICE] = "http://testpeer.com/";
        span.attributes["TestAttribute"] = "test";
        let status: SpanStatus = { code: SpanStatusCode.ERROR, message: "test error" };
        span.setStatus(status);
        let context: SpanContext = {
            traceId: "linkTraceId",
            spanId: "linkSpanId",
            traceFlags: 0
        };
        let link: Link = {
            context: context,
        };
        span.links.push(link);
        let dependency: DependencyTelemetry & Identified = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.name, "POST /path/");
        assert.equal(dependency.id, "spanId");
        assert.equal(dependency.success, false);
        assert.equal(dependency.resultCode, "404");
        assert.equal(dependency.dependencyTypeName, "HTTP");
        assert.equal(dependency.data, "http://test.com/path/");
        assert.equal(dependency.target, "http://testpeer.com/");
        assert.ok(dependency.duration);
        assert.equal(dependency.properties["TestAttribute"], "test");
        assert.equal(dependency.properties["_MS.links"], '[{"operation_Id":"linkTraceId","id":"linkSpanId"}]');
    });

    it("should populate DB dependency", () => {
        const span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.INTERNAL,
            "parentSpanId"
        );
        span.attributes[SemanticAttributes.DB_SYSTEM] = "mysql";
        span.attributes[SemanticAttributes.DB_STATEMENT] = "SELECT * FROM Test";
        span.attributes[SemanticAttributes.DB_NAME] = "TestDB";
        span.attributes[SemanticAttributes.NET_PEER_NAME] = "Test Net peer name";
        span.attributes["TestAttribute"] = "test";
        let status: SpanStatus = { code: SpanStatusCode.UNSET, message: "test" };
        span.setStatus(status);
        let dependency: DependencyTelemetry & Identified = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.name, "test span");
        assert.equal(dependency.id, "spanId");
        assert.equal(dependency.success, true);
        assert.equal(dependency.resultCode, "0");
        assert.equal(dependency.dependencyTypeName, "mysql");
        assert.equal(dependency.target, "Test Net peer name|TestDB");
        assert.equal(dependency.data, "SELECT * FROM Test");
        assert.ok(dependency.duration);
        assert.equal(dependency.properties["TestAttribute"], "test");
    });

    it("should populate RPC dependency", () => {
        const span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.INTERNAL,
            "parentSpanId"
        );
        span.attributes[SemanticAttributes.RPC_METHOD] = "TestRpcMethod";
        span.attributes[SemanticAttributes.RPC_GRPC_STATUS_CODE] = "202";
        span.attributes[SemanticAttributes.RPC_SYSTEM] = "TestRpcSystem";
        span.attributes["TestAttribute"] = "test";
        let status: SpanStatus = { code: SpanStatusCode.OK, message: "test" };
        span.setStatus(status);
        let dependency: DependencyTelemetry & Identified = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.name, "test span");
        assert.equal(dependency.id, "spanId");
        assert.equal(dependency.success, true);
        assert.equal(dependency.resultCode, "202");
        assert.equal(dependency.dependencyTypeName, "GRPC");
        assert.equal(dependency.target, "TestRpcSystem");
        assert.equal(dependency.data, "");
        assert.ok(dependency.duration);
        assert.equal(dependency.properties["TestAttribute"], "test");
    });

    it("should populate HTTP request", () => {
        const span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.SERVER,
            "parentSpanId"
        );
        span.attributes[SemanticAttributes.HTTP_METHOD] = "POST";
        span.attributes[SemanticAttributes.HTTP_STATUS_CODE] = "500";
        span.attributes[SemanticAttributes.HTTP_URL] = "http://test.com/";
        span.attributes["TestAttribute"] = "test";
        let status: SpanStatus = { code: SpanStatusCode.ERROR, message: "test error" };
        span.setStatus(status);
        let context: SpanContext = {
            traceId: "linkTraceId",
            spanId: "linkSpanId",
            traceFlags: 0
        };
        let link: Link = {
            context: context,
        };
        span.links.push(link);
        let request: RequestTelemetry & Identified = <RequestTelemetry>spanToTelemetryContract(span);
        assert.equal(request.name, "POST /");
        assert.equal(request.id, "spanId");
        assert.equal(request.success, false);
        assert.equal(request.resultCode, "500");
        assert.equal(request.url, "http://test.com/");
        assert.equal(request.source, undefined);
        assert.ok(request.duration);
        assert.equal(request.properties["TestAttribute"], "test");
        assert.equal(request.properties["_MS.links"], '[{"operation_Id":"linkTraceId","id":"linkSpanId"}]');
    });

    it("should populate GRPC request", () => {
        const span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.CONSUMER,
            "parentSpanId"
        );
        span.attributes[SemanticAttributes.RPC_GRPC_STATUS_CODE] = "505";
        span.attributes["TestAttribute"] = "test";
        let status: SpanStatus = { code: SpanStatusCode.ERROR, message: "test error" };
        span.setStatus(status);
        let request: RequestTelemetry & Identified = <RequestTelemetry>spanToTelemetryContract(span);
        assert.equal(request.name, "test span");
        assert.equal(request.id, "spanId");
        assert.equal(request.success, false);
        assert.equal(request.resultCode, "505");
        assert.equal(request.url, "");
        assert.equal(request.source, undefined);
        assert.ok(request.duration);
        assert.equal(request.properties["TestAttribute"], "test");
    });

    it("HTTP Dependency Data(URL)", () => {
        const span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.CLIENT,
            "parentSpanId"
        );
        span.attributes[SemanticAttributes.HTTP_METHOD] = "GET";
        span.attributes[SemanticAttributes.HTTP_SCHEME] = "https";
        span.attributes[SemanticAttributes.HTTP_TARGET] = "/path/12314/?q=ddds#123";
        span.attributes[SemanticAttributes.NET_PEER_PORT] = "443";
        span.attributes[SemanticAttributes.NET_PEER_IP] = "127.0.0.1";
        let dependency: DependencyTelemetry & Identified = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.data, "https://127.0.0.1:443/path/12314/?q=ddds#123");
        span.attributes[SemanticAttributes.NET_PEER_NAME] = "example.com";
        dependency = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.data, "https://example.com:443/path/12314/?q=ddds#123");
        span.attributes[SemanticAttributes.HTTP_HOST] = "www.example.org";
        dependency = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.data, "https://www.example.org/path/12314/?q=ddds#123");
    });

    it("HTTP Request Url", () => {
        const span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.SERVER,
            "parentSpanId"
        );
        span.attributes[SemanticAttributes.HTTP_METHOD] = "GET";
        span.attributes[SemanticAttributes.HTTP_SCHEME] = "https";
        span.attributes[SemanticAttributes.HTTP_TARGET] = "/path/12314/?q=ddds#123";
        span.attributes[SemanticAttributes.NET_PEER_PORT] = "443";
        span.attributes[SemanticAttributes.NET_PEER_IP] = "127.0.0.1";
        let request: RequestTelemetry & Identified = <RequestTelemetry>spanToTelemetryContract(span);
        assert.equal(request.url, "https://127.0.0.1:443/path/12314/?q=ddds#123");
        span.attributes[SemanticAttributes.NET_PEER_NAME] = "example.com";
        request = <RequestTelemetry>spanToTelemetryContract(span);
        assert.equal(request.url, "https://example.com:443/path/12314/?q=ddds#123");
        span.attributes[SemanticAttributes.HTTP_HOST] = "www.example.org";
        request = <RequestTelemetry>spanToTelemetryContract(span);
        assert.equal(request.url, "https://www.example.org/path/12314/?q=ddds#123");
    });

    it("HTTP Dependency Target", () => {
        const span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.CLIENT,
            "parentSpanId"
        );
        span.attributes[SemanticAttributes.HTTP_METHOD] = "GET";
        span.attributes[SemanticAttributes.NET_PEER_IP] = "https://127.0.0.0:443"; // Default ports
        let dependency: DependencyTelemetry & Identified = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.target, "https://127.0.0.0");
        span.attributes[SemanticAttributes.NET_PEER_NAME] = "https://test.com:80"; // Wrong Default port
        dependency = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.target, "https://test.com:80");
        span.attributes[SemanticAttributes.HTTP_URL] = "http://test.com:22"; // Non default ports
        dependency = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.target, "http://test.com:22");
        span.attributes[SemanticAttributes.HTTP_HOST] = "www.test.com"; // Wrong URL
        dependency = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.target, "www.test.com");
        span.attributes[SemanticAttributes.PEER_SERVICE] = "http://test.com/"; // No port
        dependency = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.target, "http://test.com/");
    });

    it("DB Dependency Target", () => {
        const span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.CLIENT,
            "parentSpanId"
        );
        span.attributes[SemanticAttributes.DB_SYSTEM] = "MongoDB";
        let dependency: DependencyTelemetry & Identified = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.target, "MongoDB");
        span.attributes[SemanticAttributes.DB_NAME] = "TestDB";
        dependency = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.target, "TestDB");
        span.attributes[SemanticAttributes.PEER_SERVICE] = "testPeerService";
        dependency = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.target, "testPeerService|TestDB");
    });

    it("RPC Dependency Target", () => {
        const span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.CLIENT,
            "parentSpanId"
        );
        span.attributes[SemanticAttributes.RPC_SYSTEM] = "TestSystem";
        let dependency: DependencyTelemetry & Identified = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.target, "TestSystem");
        span.attributes[SemanticAttributes.PEER_SERVICE] = "testPeerService";
        dependency = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.target, "testPeerService");
    });

    it("QueueMessage Dependency Type", () => {
        const span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.PRODUCER,
            "parentSpanId"
        );
        let dependency: DependencyTelemetry & Identified = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.dependencyTypeName, "Queue Message");
    });

    it("InProc Dependency Type", () => {
        const span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.INTERNAL,
            "parentSpanId"
        );
        let dependency: DependencyTelemetry & Identified = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.dependencyTypeName, "InProc");
    });

    it("az.namespace Dependency", () => {
        let span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.INTERNAL,
        );
        span.attributes["az.namespace"] = "Microsoft.AzureSomething";
        let dependency = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.dependencyTypeName, "InProc | Microsoft.AzureSomething");
    });

    it("EventHub Dependency", () => {
        // CLIENT Span
        let span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.CLIENT,
        );
        span.attributes["az.namespace"] = "Microsoft.EventHub";
        span.attributes["peer.address"] = "testPeerAddress";
        span.attributes["message_bus.destination"] = "messageBusDestination";
        let dependency: DependencyTelemetry & Identified = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.dependencyTypeName, "Microsoft.EventHub");
        assert.equal(dependency.target, "testPeerAddress/messageBusDestination");
        // PRODUCER Span
        span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.PRODUCER,
        );
        span.attributes["az.namespace"] = "Microsoft.EventHub";
        span.attributes["peer.address"] = "testPeerAddress";
        span.attributes["message_bus.destination"] = "messageBusDestination";
        dependency = <DependencyTelemetry>spanToTelemetryContract(span);
        assert.equal(dependency.dependencyTypeName, "Queue Message | Microsoft.EventHub");
        assert.equal(dependency.target, "testPeerAddress/messageBusDestination");
    });

    it("Eventhub Request", () => {
        const startTime = Date.now();
        let context: SpanContext = {
            traceId: "linkTraceId",
            spanId: "linkSpanId",
            traceFlags: 0
        };
        let span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.CONSUMER,
            undefined,
            [
                {
                    context: context,
                    attributes: { ["enqueuedTime"]: startTime - 111 }
                },
                {
                    context: context,
                    attributes: { ["enqueuedTime"]: startTime - 222 }
                },
                {
                    context: context,
                    attributes: { ["enqueuedTime"]: startTime - 111 }
                }
            ]
        );
        span.attributes["az.namespace"] = "Microsoft.EventHub";
        span.attributes["peer.address"] = "testPeerAddress";
        span.attributes["message_bus.destination"] = "messageBusDestination";
        let request: RequestTelemetry & Identified = <RequestTelemetry>spanToTelemetryContract(span);
        assert.equal(request.source, "testPeerAddress/messageBusDestination");
        assert.ok(!isNaN(request.measurements["timeSinceEnqueued"]));
    });
});
