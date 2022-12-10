import * as assert from "assert";
import * as sinon from "sinon";

import { AzureFunctionsHook } from "../../../src/traces/azureFunctionsHook";
import { ApplicationInsightsConfig } from "../../../src/shared";
import { TraceHandler } from "../../../src/traces";
import { Logger } from "../../../src/shared/logging";
import { HttpRequest } from "@azure/functions";
import { ReadableSpan } from "@opentelemetry/sdk-trace-base";

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
});
