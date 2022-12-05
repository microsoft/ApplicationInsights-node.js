import assert = require("assert");
import sinon = require("sinon");
import { TelemetryClient } from "../../applicationinsights";

import { AutoCollectAzureFunctions } from "../../AutoCollection/AzureFunctionsHook";

const testModule = {
    registerHook(type: string, hook: any) {

    }
};

describe("AutoCollection/AutoCollectAzureFunctions", () => {

    it("constructor", () => {
        let client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        let auto = new AutoCollectAzureFunctions(client);
        assert.equal(auto["_functionsCoreModule"], undefined, "Module is not available so it should be undefined unless running in AzFn env");
    });

    it("enable", () => {
        let client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        let auto = new AutoCollectAzureFunctions(client);
        auto["_functionsCoreModule"] = testModule;
        const addStub = sinon.stub(auto, "_addPreInvocationHook");
        const removeStub = sinon.stub(auto, "_removePreInvocationHook");
        auto.enable(true);
        assert.ok(removeStub.notCalled);
        assert.ok(addStub.calledOnce);
    });

    it("disable", () => {
        let client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        let auto = new AutoCollectAzureFunctions(client);
        auto["_functionsCoreModule"] = testModule;
        const addStub = sinon.stub(auto, "_addPreInvocationHook");
        const removeStub = sinon.stub(auto, "_removePreInvocationHook");
        auto.enable(false);
        assert.ok(removeStub.calledOnce);
        assert.ok(addStub.notCalled);
    });

    it("_addPreInvocationHook", () => {
        let client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        let auto = new AutoCollectAzureFunctions(client);
        const registerHook = sinon.stub(testModule, "registerHook");
        auto["_functionsCoreModule"] = testModule;
        auto["_addPreInvocationHook"]();
        assert.ok(registerHook.calledOnce);
    });
});
