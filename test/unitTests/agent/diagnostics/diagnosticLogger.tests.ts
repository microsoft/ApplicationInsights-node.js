// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as assert from "assert";
import * as sinon from "sinon";
import { DiagnosticLogger } from "../../../../src/agent/diagnostics/diagnosticLogger";

describe("agent/diagnostics/diagnosticLogger", () => {
    let sandbox: sinon.SinonSandbox;
    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });
    it("should console log by default", () => {
        const logger = new DiagnosticLogger("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        const consoleStub = sandbox.stub(console, "log");
        logger.logMessage({ message: "test" });
        assert(consoleStub.calledOnce);
    });
});
