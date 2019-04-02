import assert = require("assert");
import sinon = require("sinon");

import Contracts = require("../../Declarations/Contracts");
import Constants = require("../../Declarations/Constants");

describe("Library/QuickPulseEnvelopeFactory", () => {
    describe("QPS Constants", () => {
        it("should convert TelemetryTypeValues to QuickPulseType", () => {
            const keys = Object.keys(Contracts.TelemetryTypeString);
            assert.ok(keys.length > 0);
            keys.forEach((key: Contracts.TelemetryTypeKeys) => {
                const value = Contracts.TelemetryTypeString[key];
                const qpsType = Constants.TelemetryTypeStringToQuickPulseType[value];
                const qpsDocType = Constants.TelemetryTypeStringToQuickPulseDocumentType[value];
                assert.equal(qpsType, Constants.QuickPulseType[key]);
                assert.equal(qpsDocType, Constants.QuickPulseDocumentType[key]);
            })
        });
    });
});
