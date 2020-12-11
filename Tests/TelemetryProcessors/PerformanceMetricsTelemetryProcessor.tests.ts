import assert = require("assert");
import sinon = require("sinon");

import QuickPulse = require("../../TelemetryProcessors/PerformanceMetricsTelemetryProcessor");
import QuickPulseStateManager = require("../../Library/QuickPulseStateManager");
import AutoCollectPerformance = require("../../AutoCollection/Performance");
import { Contracts } from "../../applicationinsights";

describe("TelemetryProcessors/PerformanceMetricsTelemetryProcessor", () => {
    describe("#PerformanceMetricsTelemetryProcessor()", () => {
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

        it("should return true if no client provided", () => {
            var qpSpy = sinon.spy(QuickPulse, "performanceMetricsTelemetryProcessor");

            var res = QuickPulse.performanceMetricsTelemetryProcessor(envelope);
            assert.ok(qpSpy.calledOnce)
            assert.equal(res, true, "returns true");

            qpSpy.restore();
        });

        it("should add document to the provided client", () => {
            var qpSpy = sinon.spy(QuickPulse, "performanceMetricsTelemetryProcessor");
            var client: QuickPulseStateManager = new QuickPulseStateManager(ikey);
            var addDocumentStub = sinon.stub(client, "addDocument");

            // Act
            var res = QuickPulse.performanceMetricsTelemetryProcessor(envelope, client);

            // Test
            assert.ok(qpSpy.calledOnce);
            assert.equal(res, true);
            assert.ok(addDocumentStub.calledOnce);


            qpSpy.restore();
            addDocumentStub.restore();
        });
    });
});
