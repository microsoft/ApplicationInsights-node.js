import assert = require("assert");
import sinon = require("sinon");

import QuickPulseUtil = require("../../Library/QuickPulseUtil");

describe("Library/QuickPulseUtil", () => {
    describe("#getTransmissionTime", () => {
        const runTest = (returns: number, expected: number) => {
            const stub = sinon.stub(Date, "now").returns(returns);
            assert.equal(QuickPulseUtil.getTransmissionTime(), expected);
            stub.restore();
        }

        it("should return correct transmission time", () => {
            runTest(
                Date.UTC(
                    2020, 7, 5,
                    22, 15, 0,
                ), // 8/5/2020 10:15:00 PM UTC
                637322625000000000,
            );

            runTest(
                Date.UTC(
                    2020, 7, 5,
                    22, 15, 1,
                ), // 8/5/2020 10:15:01 PM UTC
                637322625010000000,
            );

            runTest(
                Date.UTC(
                    9999, 11, 31,
                    23, 59, 59,
                ), // 12/31/9999 11:59:59 PM UTC
                3155378975990000000,
            );

            runTest(
                Date.UTC(
                    2020, 7, 6,
                    10, 31, 28,
                ), // 8/6/2020 10:31:28 AM UTC
                637323066880000000,
            );
        });
    });
});
