import * as assert from "assert";
import * as sinon from "sinon";

import { AzureFunctionsHook } from "../../../src/traces/azureFunctionsHook";
import { ApplicationInsightsConfig } from "../../../src/shared";
import { TraceHandler } from "../../../src/traces";
import { Logger } from "../../../src/shared/logging";
import { HttpRequest } from "@azure/functions";
import { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { context, trace, TraceFlags } from "@opentelemetry/api";


class TestFunctionCore {
    public registerCalled: boolean = false;
    public hookName: string;

    registerHook(name: string, func: any) {
        this.registerCalled = true;
        this.hookName = name;
    }
}


describe("Library/AzureFunctionsHook", () => {
    let sandbox: sinon.SinonSandbox;
    let _config: ApplicationInsightsConfig;
    let _traceHandler: TraceHandler;

    before(() => {
        _config = new ApplicationInsightsConfig();
        _config.connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;";
        _traceHandler = new TraceHandler(_config);
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("Hook not added if not running in Azure Functions", () => {
        const spy = sandbox.spy(Logger.getInstance(), "debug");
        let hook = new AzureFunctionsHook(_traceHandler, _config);
        assert.equal(hook["_functionsCoreModule"], undefined);
        assert.ok(spy.called);
        assert.equal(spy.args[0][0], "@azure/functions-core failed to load, not running in Azure Functions");
    });

    it("Hook added if running in Azure Functions", () => {
        let hook = new AzureFunctionsHook(_traceHandler, _config);
        let testCore = new TestFunctionCore();
        hook["_functionsCoreModule"] = testCore;
        hook["_addPreInvocationHook"]();
        assert.ok(testCore.registerCalled);
        assert.equal(testCore.hookName, "preInvocation");
    });

    it("_generateServerSpan", () => {
        let hook = new AzureFunctionsHook(_traceHandler, _config);
        let request: HttpRequest = {
            method: "HEAD",
            url: "test.com",
            headers: { "": "" },
            query: { "": "" },
            params: null,
            user: null,
            parseFormBody: null
        };
        const span = (hook["_generateServerSpan"](request) as any) as ReadableSpan;
        assert.equal(span.attributes["http.url"], "http://localhosttest.com");
        assert.equal(span.attributes["net.host.name"], "localhost");
        assert.equal(span.attributes["http.method"], "HEAD");
        assert.equal(span.attributes["http.target"], "test.com");
    });

    it("Context propagation", () => {
        let hook = new AzureFunctionsHook(_traceHandler, _config);
        let flushStub = sandbox.stub(hook["_traceHandler"], "flush");
        let contextSpy = sandbox.spy(context, "with");
        let createSpanSpy = sandbox.spy(hook as any, "_generateServerSpan");
        let ctx = {
            invocationId: "",
            done: () => { },
            res: {},
            traceContext: {
                traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
                tracestate: "",
                attributes: {}
            }
        };
        let request: HttpRequest = {
            method: "HEAD",
            url: "test.com",
            headers: { "": "" },
            query: { "": "" },
            params: null,
            user: null,
            parseFormBody: null
        };
        let originalCallbackCalled = false;
        let originalCallback = () => { originalCallbackCalled = true };
        hook["_propagateContext"](ctx as any, request, originalCallback);

        assert.ok(originalCallbackCalled);
        assert.ok(createSpanSpy.called);
        assert.ok(flushStub.called);

        let propagatedContext = contextSpy.args[0][0];
        const extractedSpanContext = trace.getSpanContext(propagatedContext);
        assert.deepStrictEqual(extractedSpanContext, {
            spanId: 'b7ad6b7169203331',
            traceId: '0af7651916cd43dd8448eb211c80319c',
            isRemote: true,
            traceFlags: TraceFlags.SAMPLED,
          });
    });
});
