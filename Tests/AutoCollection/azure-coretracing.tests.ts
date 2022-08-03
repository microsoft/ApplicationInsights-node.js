import assert = require("assert");
import sinon = require("sinon");
import { Span, BasicTracerProvider, TracerConfig } from "@opentelemetry/sdk-trace-base";
import { SpanKind, ROOT_CONTEXT } from "@opentelemetry/api";

import AppInsights = require("../../applicationinsights");
import { channel } from "diagnostic-channel";
import { enable } from "../../AutoCollection/diagnostic-channel/azure-coretracing.sub";
import { DependencyTelemetry } from "../../Declarations/Contracts";

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

    it("should call trackDependency for client spans", () => {
        AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        AppInsights.start();
        const trackRequestStub = sandbox.stub(AppInsights.defaultClient, "trackRequest");
        const trackDependencyStub = sandbox.stub(AppInsights.defaultClient, "trackDependency");
        enable(true, AppInsights.defaultClient);
        const span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.CLIENT,
            "parentSpanId"
        );
        channel.publish("azure-coretracing", span);
        assert.ok(trackRequestStub.notCalled);
        assert.ok(trackDependencyStub.called);
        var dependency = <DependencyTelemetry>trackDependencyStub.args[0][0]
        assert.deepEqual(dependency.name, "test span");
    });

    it("should call trackDependency for internal spans", () => {
        AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        AppInsights.start();
        const trackRequestStub = sandbox.stub(AppInsights.defaultClient, "trackRequest");
        const trackDependencyStub = sandbox.stub(AppInsights.defaultClient, "trackDependency");
        enable(true, AppInsights.defaultClient);
        const span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.INTERNAL,
            "parentSpanId"
        );
        channel.publish("azure-coretracing", span);
        assert.ok(trackRequestStub.notCalled);
        assert.ok(trackDependencyStub.called);
        var dependency = <DependencyTelemetry>trackDependencyStub.args[0][0]
        assert.deepEqual(dependency.name, "test span");
    });

    it("should call trackDependency for producer spans", () => {
        AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        AppInsights.start();
        const trackRequestStub = sandbox.stub(AppInsights.defaultClient, "trackRequest");
        const trackDependencyStub = sandbox.stub(AppInsights.defaultClient, "trackDependency");
        enable(true, AppInsights.defaultClient);
        const span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.PRODUCER,
            "parentSpanId"
        );
        channel.publish("azure-coretracing", span);
        assert.ok(trackRequestStub.notCalled);
        assert.ok(trackDependencyStub.called);
        var dependency = <DependencyTelemetry>trackDependencyStub.args[0][0]
        assert.deepEqual(dependency.name, "test span");
    });

    it("should call trackRequest for server span", () => {
        AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        AppInsights.start();
        const trackRequestStub = sandbox.stub(AppInsights.defaultClient, "trackRequest");
        const trackDependencyStub = sandbox.stub(AppInsights.defaultClient, "trackDependency");
        enable(true, AppInsights.defaultClient);
        const span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.SERVER,
            "parentSpanId"
        );
        channel.publish("azure-coretracing", span);
        assert.ok(trackRequestStub.called);
        assert.ok(trackDependencyStub.notCalled);
        var request = <DependencyTelemetry>trackRequestStub.args[0][0]
        assert.deepEqual(request.name, "test span");
    });

    it("should call trackRequest for consumer span", () => {
        AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        AppInsights.start();
        const trackRequestStub = sandbox.stub(AppInsights.defaultClient, "trackRequest");
        const trackDependencyStub = sandbox.stub(AppInsights.defaultClient, "trackDependency");
        enable(true, AppInsights.defaultClient);
        const span = new Span(
            tracer,
            ROOT_CONTEXT,
            "test span",
            { traceId: "traceid", spanId: "spanId", traceFlags: 0 },
            SpanKind.CONSUMER,
            "parentSpanId"
        );
        channel.publish("azure-coretracing", span);
        assert.ok(trackRequestStub.called);
        assert.ok(trackDependencyStub.notCalled);
        var request = <DependencyTelemetry>trackRequestStub.args[0][0]
        assert.deepEqual(request.name, "test span");
    });
});
