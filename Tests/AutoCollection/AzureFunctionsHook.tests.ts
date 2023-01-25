import assert = require("assert");
import sinon = require("sinon");
import { PostInvocationCallback, PostInvocationContext, PreInvocationCallback, PreInvocationContext } from "@azure/functions-core";
import { Context, HttpRequest } from "@azure/functions";

import { TelemetryClient } from "../../applicationinsights";
import { AzureFunctionsHook } from "../../AutoCollection/AzureFunctionsHook";
import { CorrelationContextManager } from "../../AutoCollection/CorrelationContextManager";
import Logging = require("../../Library/Logging");


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
        let azureFnHook = new AzureFunctionsHook(client);
        assert.equal(azureFnHook["_functionsCoreModule"], undefined);
        assert.ok(spy.called);
        assert.equal(spy.args[0][0], "AzureFunctionsHook failed to load, not running in Azure Functions");
    });

    it("enable/disable", () => {
        let azureFnHook = new AzureFunctionsHook(client);
        azureFnHook.enable(true);
        assert.equal(azureFnHook["_autoGenerateIncomingRequests"], true);
        azureFnHook.enable(false);
        assert.equal(azureFnHook["_autoGenerateIncomingRequests"], false);
    });

    describe("AutoCollection/AzureFunctionsHook load fake Azure Functions Core", () => {
        let originalRequire: any;

        before(() => {
            var Module = require('module');
            originalRequire = Module.prototype.require;
        });

        afterEach(() => {
            var Module = require('module');
            Module.prototype.require = originalRequire;
        });

        it("Hook not added if using not supported programming model", () => {
            var Module = require('module');
            var preInvocationCalled = false;
            var postInvocationCalled = false;
            Module.prototype.require = function () {
                if (arguments[0] === "@azure/functions-core") {
                    return {
                        registerHook(name: string, callback: PreInvocationCallback | PostInvocationCallback) {
                            if (name === "preInvocation") {
                                preInvocationCalled = true;
                            }
                            else if (name === "postInvocation") {
                                postInvocationCalled = true;
                            }
                        },
                        getProgrammingModel() {
                            return {
                                name: "@azure/functions",
                                version: "2.x"
                            };
                        }
                    };
                }
                return originalRequire.apply(this, arguments);
            };
            let azureFnHook = new AzureFunctionsHook(client);
            assert.ok(azureFnHook, "azureFnHook");
            assert.ok(!preInvocationCalled, "preInvocationCalled");
            assert.ok(!postInvocationCalled, "postInvocationCalled");
        });

        it("Pre Invokation Hook added if running in Azure Functions and context is propagated", () => {
            var Module = require('module');
            var preInvocationCalled = false;
            var postInvocationCalled = false;
            Module.prototype.require = function () {
                if (arguments[0] === "@azure/functions-core") {
                    return {
                        registerHook(name: string, callback: PreInvocationCallback | PostInvocationCallback) {
                            if (name === "preInvocation") {
                                preInvocationCalled = true;
                                let ctx = {
                                    res: { "status": 400 },
                                    invocationId: "testinvocationId",
                                    traceContext: {
                                        traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
                                        tracestate: "",
                                        attributes: {
                                            "OperationName": "testOperationName",
                                            "ProcessId": "testProcessId",
                                            "LogLevel": "testLogLevel",
                                            "Category": "testCategory",
                                            "HostInstanceId": "testHostInstanceId",
                                            "#AzFuncLiveLogsSessionId": "testAzFuncLiveLogsSessionId",
                                        }
                                    }
                                };
                                let preInvocationContext: PreInvocationContext = {
                                    inputs: [],
                                    functionCallback: (unknown: any, inputs: unknown[]) => {
                                        let currentContext = CorrelationContextManager.getCurrentContext();
                                        // Context should be propagated here
                                        assert.equal(currentContext.operation.id, "0af7651916cd43dd8448eb211c80319c");
                                        assert.equal(currentContext.operation.name, "testOperationName");
                                        assert.equal(currentContext.operation.parentId, "|0af7651916cd43dd8448eb211c80319c.b7ad6b7169203331.");
                                        assert.equal(currentContext.customProperties.getProperty("InvocationId"), "testinvocationId");
                                        assert.equal(currentContext.customProperties.getProperty("ProcessId"), "testProcessId");
                                        assert.equal(currentContext.customProperties.getProperty("LogLevel"), "testLogLevel");
                                        assert.equal(currentContext.customProperties.getProperty("Category"), "testCategory");
                                        assert.equal(currentContext.customProperties.getProperty("HostInstanceId"), "testHostInstanceId");
                                        assert.equal(currentContext.customProperties.getProperty("AzFuncLiveLogsSessionId"), "testAzFuncLiveLogsSessionId");

                                    },
                                    hookData: {},
                                    appHookData: {},
                                    invocationContext: ctx
                                };
                                // Azure Functions should call preinvocation callback
                                (callback as PreInvocationCallback)(preInvocationContext);
                                // Azure Functions should call customer function callback
                                preInvocationContext.functionCallback(null, null);
                            }
                            else if (name === "postInvocation") {
                                postInvocationCalled = true;
                            }
                        },

                        getProgrammingModel() {
                            return {
                                name: "@azure/functions",
                                version: "3.x"
                            };
                        }
                    };
                }
                return originalRequire.apply(this, arguments);
            };
            let azureFnHook = new AzureFunctionsHook(client);
            assert.ok(azureFnHook, "azureFnHook");
            assert.ok(preInvocationCalled, "preInvocationCalled");
            assert.ok(postInvocationCalled, "postInvocationCalled");
        });

        it("Post invocation Hook added, context is propagated and incoming request is generated if turned on", () => {
            var Module = require('module');
            var preInvocationCalled = false;
            var postInvocationCalled = false;
            var preInvokationCallback: PreInvocationCallback;
            var postInvokationCallback: PostInvocationCallback;
            Module.prototype.require = function () {
                if (arguments[0] === "@azure/functions-core") {
                    return {
                        registerHook(name: string, callback: PreInvocationCallback | PostInvocationCallback) {
                            if (name === "preInvocation") {
                                preInvocationCalled = true;
                                preInvokationCallback = (callback as PreInvocationCallback);
                            }
                            else if (name === "postInvocation") {
                                postInvocationCalled = true;
                                postInvokationCallback = (callback as PostInvocationCallback);
                            }
                        },
                        getProgrammingModel() {
                            return {
                                name: "@azure/functions",
                                version: "3.x"
                            };
                        }
                    };
                }
                return originalRequire.apply(this, arguments);
            };
            let azureFnHook = new AzureFunctionsHook(client);
            azureFnHook.enable(true);
            assert.ok(azureFnHook, "azureFnHook");
            assert.ok(preInvocationCalled, "preInvocationCalled");
            assert.ok(postInvocationCalled, "postInvocationCalled");

            let context: Context = {
                invocationId: "testinvocationId",
                traceContext: {
                    traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
                    tracestate: "",
                    attributes: {
                        "OperationName": "testOperationName",
                        "ProcessId": "testProcessId",
                        "LogLevel": "testLogLevel",
                        "Category": "testCategory",
                        "HostInstanceId": "testHostInstanceId",
                        "#AzFuncLiveLogsSessionId": "testAzFuncLiveLogsSessionId",
                    }
                },
                res: {
                    "status": 400,
                },
                executionContext: null,
                bindingData: null,
                bindings: null,
                bindingDefinitions: [{
                    name: null,
                    type: "httptrigger",
                    direction: null
                }],
                log: null,
                done: null
            };
            let preInvocationContext: PreInvocationContext = {
                inputs: [],
                functionCallback: (unknown: any, inputs: unknown[]) => { },
                hookData: {},
                appHookData: {},
                invocationContext: context
            };
            // Azure Functions should call preinvocation callback
            preInvokationCallback(preInvocationContext);
            assert.ok(preInvocationContext.hookData.appInsightsStartTime,"appInsightsStartTime");
            assert.ok(preInvocationContext.hookData.appInsightsExtractedContext);

            let trackRequestSpy = sandbox.stub(client, "trackRequest");
            // Azure Functions should call postInvokation callback
            let request: HttpRequest = {
                method: "HEAD",
                url: "test.com",
                headers: { "": "" },
                query: null,
                params: null,
                user: null,
                get: null,
                parseFormBody: null
            };
            let postInvocationContext: PostInvocationContext = {
                inputs: [
                    request
                ],
                result: null,
                error: null,
                hookData: preInvocationContext.hookData,
                appHookData: {},
                invocationContext: context
            };
            postInvokationCallback(postInvocationContext);
            assert.ok(trackRequestSpy.called);
            let incomingRequest = trackRequestSpy.args[0][0];
            assert.equal(incomingRequest.id, "|0af7651916cd43dd8448eb211c80319c.b7ad6b7169203331.");
            assert.equal(incomingRequest.name, "HEAD test.com");
            assert.equal(incomingRequest.resultCode, 400);
            assert.equal(incomingRequest.success, false);
            assert.equal(incomingRequest.url, "test.com");
        });
    });
});
