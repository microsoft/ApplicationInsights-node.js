import * as assert from "assert";
import * as sinon from "sinon";
import { preAggregatedMetricsTelemetryProcessor } from "../../../../Library/TelemetryProcessors/PreAggregatedMetricsTelemetryProcessor";
import { AutoCollectPreAggregatedMetrics } from "../../../../AutoCollection/PreAggregatedMetrics";
import { Contracts, TelemetryClient } from "../../../../applicationinsights";

describe("TelemetryProcessors/PreAggregatedMetricsTelemetryProcessor", () => {
    var sandbox: sinon.SinonSandbox;
    let envelope: Contracts.Envelope;
    let client: TelemetryClient;
    let metrics: AutoCollectPreAggregatedMetrics;

    before(() => {
        sandbox = sinon.sandbox.create();
        var ikey = "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
        envelope = {
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
        client = new TelemetryClient(ikey);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#preAggregatedMetricsTelemetryProcessor()", () => {
        it("Exception telemetry", () => {
            var pgSpy = sandbox.spy(client.metricHandler, "countPreAggregatedException");
            var exception = new Contracts.ExceptionData();
            var data = new Contracts.Data<Contracts.ExceptionData>();
            data.baseData = exception;
            envelope.data = data;
            envelope.data.baseType = "ExceptionData";
            var res = preAggregatedMetricsTelemetryProcessor(envelope, client);
            var testEnv = <any>envelope;
            assert.equal(testEnv.data.baseData.properties["_MS.ProcessedByMetricExtractors"], "(Name:'Exceptions', Ver:'1.1')");
            assert.ok(pgSpy.calledOnce);
        });

        it("Trace telemetry", () => {
            var pgSpy = sandbox.spy(client.metricHandler, "countPreAggregatedTrace");
            var trace: Contracts.TraceTelemetry = { message: "" };
            var data = new Contracts.Data<Contracts.TraceTelemetry>();
            data.baseData = trace;
            envelope.data = data;
            envelope.data.baseType = "MessageData";
            var res = preAggregatedMetricsTelemetryProcessor(envelope, client);
            var testEnv = <any>envelope;
            assert.equal(testEnv.data.baseData.properties["_MS.ProcessedByMetricExtractors"], "(Name:'Traces', Ver:'1.1')");
            assert.ok(pgSpy.calledOnce);
        });

        it("Dependency telemetry", () => {
            var pgSpy = sandbox.spy(client.metricHandler, "countPreAggregatedDependency");
            var dependency: Contracts.DependencyTelemetry = { name: "", dependencyTypeName: "", data: "", duration: 1, resultCode: "", success: false };
            var data = new Contracts.Data<Contracts.DependencyTelemetry>();
            data.baseData = dependency;
            envelope.data = data;
            envelope.data.baseType = "RemoteDependencyData";
            var res = preAggregatedMetricsTelemetryProcessor(envelope, client);
            var testEnv = <any>envelope;
            assert.equal(testEnv.data.baseData.properties["_MS.ProcessedByMetricExtractors"], "(Name:'Dependencies', Ver:'1.1')");
            assert.ok(pgSpy.calledOnce);
        });

        it("Request telemetry", () => {
            var pgSpy = sandbox.spy(client.metricHandler, "countPreAggregatedRequest");
            var request: Contracts.RequestTelemetry = { name: "", url: "", duration: 1, resultCode: "", success: false };
            var data = new Contracts.Data<Contracts.RequestTelemetry>();
            data.baseData = request;
            envelope.data = data;
            envelope.data.baseType = "RequestData";
            var res = preAggregatedMetricsTelemetryProcessor(envelope, client);
            var testEnv = <any>envelope;
            assert.equal(testEnv.data.baseData.properties["_MS.ProcessedByMetricExtractors"], "(Name:'Requests', Ver:'1.1')");
            assert.ok(pgSpy.calledOnce);
        });
    });
});
