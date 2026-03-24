// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import assert from "assert";
import sinon from "sinon";

import { AutoCollectExceptions, _StackFrame, parseStack } from "../../../src/logs/exceptions";

describe("AutoCollection/Exceptions", () => {
    let sandbox: sinon.SinonSandbox;

    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("enable auto collection", () => {
        const processOnSpy = sandbox.spy(global.process, "on");
        new AutoCollectExceptions(null);
        assert.equal(
            processOnSpy.callCount,
            2,
            "After enabling exception auto collection, there should be 2 calls to processOnSpy"
        );
        assert.equal(processOnSpy.getCall(0).args[0], "uncaughtException");
        assert.equal(processOnSpy.getCall(1).args[0], "unhandledRejection");
    });

    it("disables auto collection", () => {
        const processRemoveListenerSpy = sandbox.spy(global.process, "removeListener");
        const exceptions = new AutoCollectExceptions(null);
        exceptions.shutdown();
        assert.equal(
            processRemoveListenerSpy.callCount,
            2,
            "After enabling exception auto collection, there should be 2 calls to processOnSpy"
        );
        assert.equal(processRemoveListenerSpy.getCall(0).args[0], "uncaughtException");
        assert.equal(processRemoveListenerSpy.getCall(1).args[0], "unhandledRejection");
    });
});

describe("StackFrame Parsing", () => {
    it("should parse standard stack frames", () => {
        const frame = new _StackFrame("    at Object.<anonymous> (/path/to/file.js:10:5)", 0);
        assert.equal(frame.method, "Object.<anonymous>");
        assert.equal(frame.fileName, "/path/to/file.js");
        assert.equal(frame.line, 10);
    });

    it("should parse native frames with empty parens (issue #698)", () => {
        const frame = new _StackFrame("    at Array.forEach ()", 0);
        assert.equal(frame.method, "Array.forEach");
        assert.equal(frame.fileName, "<no_filename>");
        assert.equal(frame.line, 0);
    });

    it("should parse native frames with <anonymous>", () => {
        const frame = new _StackFrame("    at Array.forEach (<anonymous>)", 0);
        assert.equal(frame.method, "Array.forEach");
        assert.equal(frame.fileName, "<no_filename>");
        assert.equal(frame.line, 0);
    });

    it("should parse native frames with native keyword", () => {
        const frame = new _StackFrame("    at Array.forEach (native)", 0);
        assert.equal(frame.method, "Array.forEach");
        assert.equal(frame.fileName, "<no_filename>");
        assert.equal(frame.line, 0);
    });

    it("parseStack should include native frames in parsed output", () => {
        const stack = [
            "Error: test",
            "    at Object.<anonymous> (/path/to/file.js:10:5)",
            "    at Array.forEach ()",
            "    at Module._compile (internal/modules/cjs/loader.js:778:30)",
        ].join("\n");

        const parsed = parseStack(stack);
        assert.equal(parsed.length, 3);
        assert.equal(parsed[0].method, "Object.<anonymous>");
        assert.equal(parsed[1].method, "Array.forEach");
        assert.equal(parsed[1].fileName, "<no_filename>");
        assert.equal(parsed[2].method, "Module._compile");
    });
});
