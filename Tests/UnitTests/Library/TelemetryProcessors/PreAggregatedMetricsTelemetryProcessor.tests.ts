import * as assert from "assert";
import * as sinon from "sinon";
import { preAggregatedMetricsTelemetryProcessor } from "../../../../src/library/TelemetryProcessors/PreAggregatedMetricsTelemetryProcessor";
import { AutoCollectPreAggregatedMetrics } from "../../../../src/autoCollection/preAggregatedMetrics";
import { Contracts, TelemetryClient } from "../../../../src/applicationinsights";
import {
  TelemetryItem as Envelope,
  TelemetryExceptionData,
  MessageData,
  RemoteDependencyData,
  RequestData,
} from "../../../../src/Declarations/Generated";

describe("TelemetryProcessors/PreAggregatedMetricsTelemetryProcessor", () => {
  var sandbox: sinon.SinonSandbox;
  let envelope: Envelope;
  let client: TelemetryClient;

  before(() => {
    sandbox = sinon.createSandbox();
    var ikey = "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
    envelope = {
      name: "name",
      data: {
        baseType: "SomeData",
      },
      instrumentationKey: ikey,
      sampleRate: 100,
      time: new Date(),
    };
    client = new TelemetryClient(ikey);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("#preAggregatedMetricsTelemetryProcessor()", () => {
    it("Exception telemetry", () => {
      var pgSpy = sandbox.spy(client.metricHandler, "countPreAggregatedException");
      var data: TelemetryExceptionData = { exceptions: [] };
      envelope.data.baseData = data;
      envelope.data.baseType = "ExceptionData";
      var res = preAggregatedMetricsTelemetryProcessor(envelope, client);
      var testEnv = <any>envelope;
      assert.equal(
        testEnv.data.baseData.properties["_MS.ProcessedByMetricExtractors"],
        "(Name:'Exceptions', Ver:'1.1')"
      );
      assert.ok(pgSpy.calledOnce);
    });

    it("Trace telemetry", () => {
      var pgSpy = sandbox.spy(client.metricHandler, "countPreAggregatedTrace");
      var data: MessageData = { message: "" };
      envelope.data.baseData = data;
      envelope.data.baseType = "MessageData";
      var res = preAggregatedMetricsTelemetryProcessor(envelope, client);
      var testEnv = <any>envelope;
      assert.equal(
        testEnv.data.baseData.properties["_MS.ProcessedByMetricExtractors"],
        "(Name:'Traces', Ver:'1.1')"
      );
      assert.ok(pgSpy.calledOnce);
    });

    it("Dependency telemetry", () => {
      var pgSpy = sandbox.spy(client.metricHandler, "countPreAggregatedDependency");
      var data: RemoteDependencyData = {
        name: "",
        dependencyTypeName: "",
        data: "",
        duration: "1",
        resultCode: "",
        success: false,
      };
      envelope.data.baseData = data;
      envelope.data.baseType = "RemoteDependencyData";
      var res = preAggregatedMetricsTelemetryProcessor(envelope, client);
      var testEnv = <any>envelope;
      assert.equal(
        testEnv.data.baseData.properties["_MS.ProcessedByMetricExtractors"],
        "(Name:'Dependencies', Ver:'1.1')"
      );
      assert.ok(pgSpy.calledOnce);
    });

    it("Request telemetry", () => {
      var pgSpy = sandbox.spy(client.metricHandler, "countPreAggregatedRequest");
      var data: RequestData = { id: "", name: "", duration: "1", responseCode: "", success: false };
      envelope.data.baseData = data;
      envelope.data.baseType = "RequestData";
      var res = preAggregatedMetricsTelemetryProcessor(envelope, client);
      var testEnv = <any>envelope;
      assert.equal(
        testEnv.data.baseData.properties["_MS.ProcessedByMetricExtractors"],
        "(Name:'Requests', Ver:'1.1')"
      );
      assert.ok(pgSpy.calledOnce);
    });
  });
});
