import assert = require("assert");
import sinon = require("sinon");

import QuickPulseUtil = require("../../Library/QuickPulseUtil");

describe("Library/QuickPulseUtil", () => {
    describe("#getTransmissionTime", () => {
        it("should return correct transmission time", () => {
            const stub = sinon.stub(Date, "now").returns(Date.UTC(
                2020, 7, 5,
                22, 15, 0,
            )); // 8/5/2020 10:15:00 PM UTC
            assert.equal(
                QuickPulseUtil.getTransmissionTime(),637322625000000000,
            );
            stub.restore();
        });

        it("should return correct transmission time", () => {
            const stub = sinon.stub(Date, "now").returns(Date.UTC(
                2020, 7, 5,
                22, 15, 1,
            )); // 8/5/2020 10:15:01 PM UTC)
            assert.equal(
                QuickPulseUtil.getTransmissionTime(),637322625010000000,
            );
            stub.restore();
        });
    });
});
