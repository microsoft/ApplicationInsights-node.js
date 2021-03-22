import assert = require("assert");
import sinon = require("sinon");
import Client = require("../../Library/TelemetryClient");
import TelemetryProcessor = require("../../TelemetryProcessors/PreAggregatedMetricsTelemetryProcessor");
import AutoCollecPreAggregatedMetrics = require("../../AutoCollection/PreAggregatedMetrics");
import { Contracts } from "../../applicationinsights";
import { env } from "process";

describe("TelemetryProcessors/PreAggregatedMetricsTelemetryProcessor", () => {
    describe("#preAggregatedMetricsTelemetryProcessor()", () => {
        var envelope: Contracts.Envelope = {
            ver: 2,
            name: "name",
            data: {
                baseType: "SomeData"
            },
            iKey: ikey,
            sampleRate: 100,
            seq: "",
            time: "",
            tags: []
        };
        var ikey = "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
        var client = new Client(ikey);

        it("Exception telemetry", () => {
            var pgSpy = sinon.spy(AutoCollecPreAggregatedMetrics, "countException");
            var exception = new Contracts.ExceptionData();
            var data = new Contracts.Data<Contracts.ExceptionData>();
            data.baseData = exception;
            envelope.data = data;
            envelope.data.baseType = "ExceptionData";
            var res = TelemetryProcessor.preAggregatedMetricsTelemetryProcessor(envelope, client.context);
            var testEnv = <any>envelope;
            assert.equal(testEnv.data.baseData.properties["_MS.ProcessedByMetricExtractors"], "(Name:'Exceptions', Ver:'1.1')");
            assert.ok(pgSpy.calledOnce);
            pgSpy.restore();
        });

        it("Trace telemetry", () => {
            var pgSpy = sinon.spy(AutoCollecPreAggregatedMetrics, "countTrace");
            var trace: Contracts.TraceTelemetry = { message: "" };
            var data = new Contracts.Data<Contracts.TraceTelemetry>();
            data.baseData = trace;
            envelope.data = data;
            envelope.data.baseType = "MessageData";
            var res = TelemetryProcessor.preAggregatedMetricsTelemetryProcessor(envelope, client.context);
            var testEnv = <any>envelope;
            assert.equal(testEnv.data.baseData.properties["_MS.ProcessedByMetricExtractors"], "(Name:'Traces', Ver:'1.1')");
            assert.ok(pgSpy.calledOnce);
            pgSpy.restore();
        });

        it("Dependency telemetry", () => {
            var pgSpy = sinon.spy(AutoCollecPreAggregatedMetrics, "countDependency");
            var dependency: Contracts.DependencyTelemetry = { name: "", dependencyTypeName: "", data: "", duration: 1, resultCode: "", success: false };
            var data = new Contracts.Data<Contracts.DependencyTelemetry>();
            data.baseData = dependency;
            envelope.data = data;
            envelope.data.baseType = "RemoteDependencyData";
            var res = TelemetryProcessor.preAggregatedMetricsTelemetryProcessor(envelope, client.context);
            var testEnv = <any>envelope;
            assert.equal(testEnv.data.baseData.properties["_MS.ProcessedByMetricExtractors"], "(Name:'Dependencies', Ver:'1.1')");
            assert.ok(pgSpy.calledOnce);
            pgSpy.restore();
        });

        it("Request telemetry", () => {
            var pgSpy = sinon.spy(AutoCollecPreAggregatedMetrics, "countRequest");
            var request: Contracts.RequestTelemetry = { name: "", url: "", duration: 1, resultCode: "", success: false };
            var data = new Contracts.Data<Contracts.RequestTelemetry>();
            data.baseData = request;
            envelope.data = data;
            envelope.data.baseType = "RequestData";
            var res = TelemetryProcessor.preAggregatedMetricsTelemetryProcessor(envelope, client.context);
            var testEnv = <any>envelope;
            assert.equal(testEnv.data.baseData.properties["_MS.ProcessedByMetricExtractors"], "(Name:'Requests', Ver:'1.1')");
            assert.ok(pgSpy.calledOnce);
            pgSpy.restore();
        });
    });
});
