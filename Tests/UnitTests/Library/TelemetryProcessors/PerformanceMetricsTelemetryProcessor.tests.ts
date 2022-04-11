import * as assert from "assert";
import * as sinon from "sinon";

import { Config } from "../../../../Library/Configuration/Config";
import * as QuickPulse from "../../../../Library/TelemetryProcessors/PerformanceMetricsTelemetryProcessor";
import { QuickPulseStateManager } from "../../../../Library/QuickPulse/QuickPulseStateManager";
import { TelemetryClient } from "../../../../applicationinsights";
import { TelemetryItem as Envelope } from "../../../../Declarations/Generated";


describe("TelemetryProcessors/PerformanceMetricsTelemetryProcessor", () => {
    var sandbox: sinon.SinonSandbox;
    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#PerformanceMetricsTelemetryProcessor()", () => {
        var envelope: Envelope = {
            name: "name",
            data: {
                baseType: "SomeData"
            },
            instrumentationKey: ikey,
            sampleRate: 100,
            time: new Date()
        };
        var ikey = "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";

        it("should return true if no client provided", () => {
            var qpSpy = sandbox.spy(QuickPulse, "performanceMetricsTelemetryProcessor");
            var telemetryClient: TelemetryClient = new TelemetryClient(ikey);
            var res = QuickPulse.performanceMetricsTelemetryProcessor(envelope, telemetryClient);
            assert.ok(qpSpy.calledOnce)
            assert.equal(res, true, "returns true");
        });

        it("should add document to the provided client", () => {
            var qpSpy = sandbox.spy(QuickPulse, "performanceMetricsTelemetryProcessor");
            var telemetryClient: TelemetryClient = new TelemetryClient(ikey);
            telemetryClient.quickPulseClient = new QuickPulseStateManager(new Config(ikey));
            var addDocumentStub = sandbox.stub(telemetryClient.quickPulseClient, "addDocument");
            // Act
            var res = QuickPulse.performanceMetricsTelemetryProcessor(envelope, telemetryClient);
            // Test
            assert.ok(qpSpy.calledOnce);
            assert.equal(res, true);
            assert.ok(addDocumentStub.calledOnce);
        });
    });
});
