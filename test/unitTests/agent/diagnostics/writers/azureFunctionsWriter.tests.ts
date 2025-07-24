// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from "assert";
import sinon from "sinon";
import { AzureFunctionsWriter } from "../../../../../src/agent/diagnostics/writers/azureFunctionsWriter";

describe("agent//diagnostics/writers/fileWriter", () => {
    let sandbox: sinon.SinonSandbox;
    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("should log", () => {
        const writer = new AzureFunctionsWriter("testIkey");
        const consoleInfoStub = sandbox.stub(console, "info");
        writer.log("test");
        assert.ok(consoleInfoStub.calledOnce);
    });

    it("should error", () => {
        const writer = new AzureFunctionsWriter("testIkey");
        const consoleErrorStub = sandbox.stub(console, "error");
        writer.error("test error");
        assert.ok(consoleErrorStub.calledOnce);
    });
});
