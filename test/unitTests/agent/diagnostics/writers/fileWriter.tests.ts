// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as assert from "assert";
import * as sinon from "sinon";
import { FileWriter } from "../../../../../src/agent/diagnostics/writers/fileWriter";
import * as fs from "fs";

describe("agent//diagnostics/writers/fileWriter", () => {
    let sandbox: sinon.SinonSandbox;
    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });
    it("should call renameCurrentFile if renamePolicy is set to rolling", () => {
        const writer = new FileWriter("test", "test", { append: true, renamePolicy: "rolling" });
        const shouldRenameStub = sandbox.stub(writer, "_shouldRenameFile" as any);
        writer.log("test");
        assert.ok(shouldRenameStub.calledOnce);
    });

    it("should append file", () => {
        const appendStub = sandbox.stub(fs, "appendFile");
        const writer = new FileWriter("test", "test", { append: true });
        writer["_appendFile"]("test");
        assert.ok(appendStub.calledOnce);
    });
});
