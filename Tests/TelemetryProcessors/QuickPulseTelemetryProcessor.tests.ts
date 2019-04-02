import assert = require("assert");
import sinon = require("sinon");

import QuickPulse = require("../../TelemetryProcessors/QuickPulseTelemetryProcessor");
import QuickPulseStateManager = require("../../Library/QuickPulseStateManager");
import AutoCollectPerformance = require("../../AutoCollection/Performance");
import { Contracts } from "../../applicationinsights";

describe("TelemetryProcessors/QuickPulseTelemetryProcessor", () => {
    describe("#quickPulseTelemetryProcessor()", () => {
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
        var ikey = "ikey";

        it("should return true if no client provided", () => {
            var qpSpy = sinon.spy(QuickPulse, "quickPulseTelemetryProcessor");

            var res = QuickPulse.quickPulseTelemetryProcessor(envelope);
            assert.ok(qpSpy.calledOnce)
            assert.equal(res, true, "returns true");

            qpSpy.restore();
        });

        it("should add document to the provided client", () => {
            var qpSpy = sinon.spy(QuickPulse, "quickPulseTelemetryProcessor");
            var client: QuickPulseStateManager = new QuickPulseStateManager(ikey);
            var addDocumentStub = sinon.stub(client, "addDocument");

            // Act
            var res = QuickPulse.quickPulseTelemetryProcessor(envelope, client);

            // Test
            assert.ok(qpSpy.calledOnce);
            assert.equal(res, true);
            assert.ok(addDocumentStub.calledOnce);


            qpSpy.restore();
            addDocumentStub.restore();
        });
    });
});
