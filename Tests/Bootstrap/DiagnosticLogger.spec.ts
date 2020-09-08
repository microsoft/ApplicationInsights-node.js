import assert = require("assert");
import { DiagnosticLogger } from "../../Bootstrap/DiagnosticLogger";

describe("DiagnosticLogger", () => {
    describe("#DiagnosticLogger.DefaultEnvelope", () => {
        it("should have the correct version string", () => {
            const version = require("../../../package.json").version;
            assert.equal(DiagnosticLogger.DefaultEnvelope.properties.sdkVersion, version);
        });
    });
});
