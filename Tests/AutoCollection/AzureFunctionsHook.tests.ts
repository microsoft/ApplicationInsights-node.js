import assert = require("assert");
import sinon = require("sinon");
import { TelemetryClient } from "../../applicationinsights";
import { AzureFunctionsHook } from "../../AutoCollection/AzureFunctionsHook";
import { CorrelationContext, CorrelationContextManager } from "../../AutoCollection/CorrelationContextManager";
import { HttpRequest } from "../../Library/Functions";
import Logging = require("../../Library/Logging");


class TestFunctionCore {
    public registerCalled: boolean = false;
    public hookName: string;

    registerHook(name: string, func: any) {
        this.registerCalled = true;
        this.hookName = name;
    }
}

describe("AutoCollection/AzureFunctionsHook", () => {
    let sandbox: sinon.SinonSandbox;
    let client: TelemetryClient;

    before(() => {
        client = new TelemetryClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
        CorrelationContextManager.enable(false);
    });


    it("Hook not added if not running in Azure Functions", () => {
        const spy = sandbox.spy(Logging, "info");
        let hook = new AzureFunctionsHook(client);
        assert.equal(hook["_functionsCoreModule"], undefined);
        assert.ok(spy.called);
        assert.equal(spy.args[0][0], "AzureFunctionsHook failed to load, not running in Azure Functions");
    });

    it("Hook added if running in Azure Functions", () => {
        let hook = new AzureFunctionsHook(client);
        let testCore = new TestFunctionCore();
        hook["_functionsCoreModule"] = <any>testCore;
        hook["_addPreInvocationHook"]();
        assert.ok(testCore.registerCalled);
        assert.equal(testCore.hookName, "preInvocation");
    });

    it("enable/disable", () => {
        let hook = new AzureFunctionsHook(client);
        hook.enable(true);
        assert.equal(hook["_autoGenerateIncomingRequests"], true);
        hook.enable(false);
        assert.equal(hook["_autoGenerateIncomingRequests"], false);
    });

    it("Context propagation", () => {
        CorrelationContextManager.enable(true);
        let hook = new AzureFunctionsHook(client);
        hook.enable(true);
        let flushStub = sandbox.stub(hook["_client"], "flush");
        let trackRequestSpy = sandbox.stub(hook["_client"], "trackRequest");
        let contextSpy = sandbox.spy(CorrelationContextManager, "wrapCallback");
        let ctx = {
            res: { "status": 400 },
            invocationId: "testinvocationId",
            traceContext: {
                traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
                tracestate: "",
                attributes: {
                    "ProcessId": "testProcessId",
                    "LogLevel": "testLogLevel",
                    "Category": "testCategory",
                    "HostInstanceId": "testHostInstanceId",
                    "#AzFuncLiveLogsSessionId": "testAzFuncLiveLogsSessionId",
                }
            }
        };
        let request: HttpRequest = {
            method: "HEAD",
            url: "test.com",
            headers: { "": "" }
        };
        let originalCallbackCalled = false;
        let originalCallback = () => { originalCallbackCalled = true };
        hook["_propagateContext"](ctx as any, request, originalCallback);
        assert.ok(contextSpy.called);
        assert.ok(originalCallbackCalled);
        assert.ok(flushStub.called);
        assert.ok(trackRequestSpy.called);
        let propagatedContext: CorrelationContext = contextSpy.args[0][1];
        assert.equal(propagatedContext.operation.id, "0af7651916cd43dd8448eb211c80319c");
        assert.equal(propagatedContext.operation.name, "HEAD /");
        assert.equal(propagatedContext.operation.parentId, "|0af7651916cd43dd8448eb211c80319c.b7ad6b7169203331.");
        assert.equal(propagatedContext.customProperties.getProperty("InvocationId"), "testinvocationId");
        assert.equal(propagatedContext.customProperties.getProperty("ProcessId"), "testProcessId");
        assert.equal(propagatedContext.customProperties.getProperty("LogLevel"), "testLogLevel");
        assert.equal(propagatedContext.customProperties.getProperty("Category"), "testCategory");
        assert.equal(propagatedContext.customProperties.getProperty("HostInstanceId"), "testHostInstanceId");
        assert.equal(propagatedContext.customProperties.getProperty("AzFuncLiveLogsSessionId"), "testAzFuncLiveLogsSessionId");
        let incomingRequest = trackRequestSpy.args[0][0];
        assert.equal(incomingRequest.id, "|0af7651916cd43dd8448eb211c80319c.b7ad6b7169203331.");
        assert.equal(incomingRequest.name, "HEAD test.com");
        assert.equal(incomingRequest.resultCode, 400);
        assert.equal(incomingRequest.success, false);
        assert.equal(incomingRequest.url, "test.com");
    });
});
