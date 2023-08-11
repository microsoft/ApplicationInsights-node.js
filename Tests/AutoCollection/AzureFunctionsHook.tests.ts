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

    describe("AutoCollection/AzureFunctionsHook load mock Azure Functions Core", () => {
        let originalRequire: any;
        let azureFnContext: Context;
        let modelVersion: string;
        let preInvocationCallback: PreInvocationCallback;
        let postInvokationCallback: PostInvocationCallback;

        const attributes = {
            "OperationName": "testOperationName",
            "ProcessId": "testProcessId",
            "LogLevel": "testLogLevel",
            "Category": "testCategory",
            "HostInstanceId": "testHostInstanceId",
            "#AzFuncLiveLogsSessionId": "testAzFuncLiveLogsSessionId",
        };
        const v3Context: Context = {
            invocationId: "testinvocationId",
            traceContext: {
                traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
                tracestate: "",
                attributes
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
        const v4Context: any = {
            invocationId: "testinvocationId",
            functionName: "httpTrigger1",
            traceContext: {
                traceParent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
                traceState: "",
                attributes
            },
            options: {
                trigger: {
                    authLevel: "anonymous",
                    methods: [
                        "GET",
                        "POST"
                    ],
                    type: "httpTrigger",
                    name: "httpTrigger1",
                    direction: "in"
                },
                return: {
                    type: "http",
                    name: "$return",
                    direction: "out"
                },
                extraInputs: [],
                extraOutputs: []
            }
        };

        before(() => {
            var Module = require('module');
            originalRequire = Module.prototype.require;
        });

        beforeEach(() => {
            preInvocationCallback = null;
            postInvokationCallback = null;
            azureFnContext = v3Context;
            modelVersion = '3.x';

            // Patch require to mock functions core
            var Module = require('module');
            Module.prototype.require = function () {
                if (arguments[0] === "@azure/functions-core") {
                    return {
                        registerHook(name: string, callback: PreInvocationCallback | PostInvocationCallback) {
                            if (name === "preInvocation") {
                                preInvocationCallback = (callback as PreInvocationCallback);
                            }
                            else if (name === "postInvocation") {
                                postInvokationCallback = (callback as PostInvocationCallback);
                            }
                        },
                        getProgrammingModel() {
                            return {
                                name: "@azure/functions",
                                version: modelVersion
                            };
                        }
                    };
                }
                return originalRequire.apply(this, arguments);
            };
        });

        afterEach(() => {
            var Module = require('module');
            Module.prototype.require = originalRequire;
        });

        it("Hook does nothing if using unsupported programming model", async () => {
            let spies = [
                sandbox.spy(CorrelationContextManager, "wrapCallback"),
                sandbox.spy(CorrelationContextManager, "startOperation"),
                sandbox.spy(CorrelationContextManager, "runWithContext")
            ];

            let azureFnHook = new AzureFunctionsHook(client);
            assert.ok(azureFnHook, "azureFnHook");
            azureFnHook.enable(true);
            assert.ok(preInvocationCallback, "preInvocationCalled");
            assert.ok(postInvokationCallback, "postInvocationCalled");

            modelVersion = '2.x';

            let preInvocationContext: PreInvocationContext = {
                inputs: [{ method: "HEAD", url: "test.com", headers: {}, }],
                functionCallback: () => { },
                hookData: {},
                appHookData: {},
                invocationContext: azureFnContext
            };
            await preInvocationCallback(preInvocationContext);

            await postInvokationCallback({
                ...preInvocationContext,
                result: null,
                error: null,
            });

            assert.deepEqual(preInvocationContext.hookData, {});
            for (const spy of spies) {
                assert.equal(spy.called, false, "CorrelationContextManager method called");
            }
        });

        for (const [testModelVersion, testInvocationContext] of [['3.x', v3Context], ['4.x', v4Context]]) {
            it(`[${testModelVersion}] Pre Invokation Hook added if running in Azure Functions and context is propagated`, async () => {
                modelVersion = testModelVersion;
                let azureFnHook = new AzureFunctionsHook(client);
                assert.ok(azureFnHook, "azureFnHook");
                assert.ok(preInvocationCallback, "preInvocationCalled");
                // Azure Functions should call preinvocation callback
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
                    invocationContext: testInvocationContext
                };
                await preInvocationCallback(preInvocationContext);
                preInvocationContext.functionCallback(testInvocationContext);
            });

            it(`[${testModelVersion}] Post invocation Hook added, context is propagated and incoming request is generated if turned on`, () => {
                modelVersion = testModelVersion;
                let azureFnHook = new AzureFunctionsHook(client);
                azureFnHook.enable(true);
                assert.ok(azureFnHook, "azureFnHook");
                assert.ok(preInvocationCallback, "preInvocationCalled");
                assert.ok(postInvokationCallback, "postInvocationCalled");

                let preInvocationContext: PreInvocationContext = {
                    inputs: [],
                    functionCallback: (unknown: any, inputs: unknown[]) => { },
                    hookData: {},
                    appHookData: {},
                    invocationContext: testInvocationContext
                };
                // Azure Functions should call preinvocation callback
                preInvocationCallback(preInvocationContext);
                assert.ok(preInvocationContext.hookData.appInsightsStartTime, "appInsightsStartTime");
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
                    result: { status: 400 },
                    error: null,
                    hookData: preInvocationContext.hookData,
                    appHookData: {},
                    invocationContext: testInvocationContext
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
        }

        it("Function code not affected by hook", async () => {
            let correlationContextSpy = sandbox.spy(CorrelationContextManager, "wrapCallback");
            let azureFnHook = new AzureFunctionsHook(client);
            assert.ok(azureFnHook, "azureFnHook");
            let someNumber = 0;
            let functionCode = () => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        someNumber = 5;
                        resolve(null);
                    }, 500);
                });
            };
            let preInvocationContext: PreInvocationContext = {
                inputs: [],
                functionCallback: functionCode,
                hookData: {},
                appHookData: {},
                invocationContext: azureFnContext
            };
            await preInvocationCallback(preInvocationContext);
            assert.ok(correlationContextSpy.called);
            await functionCode();
            assert.equal(someNumber, 5);
        });
    });
});
