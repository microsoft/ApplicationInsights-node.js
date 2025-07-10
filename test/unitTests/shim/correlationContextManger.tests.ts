// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import assert from "assert";
import sinon from "sinon";
import * as events from "events";
import { SpanContext, context, trace, diag, DiagLogger } from "@opentelemetry/api";
import { TraceState } from "@opentelemetry/core";
import { Span } from "@opentelemetry/sdk-trace-base";
import * as azureFunctionTypes from "@azure/functions-old";
import { CorrelationContextManager } from '../../../src/shim/correlationContextManager';
import { ICorrelationContext, ITraceparent, ITracestate } from "../../../src/shim/types";
import { HttpRequest, InvocationContext, TraceContext } from "@azure/functions";
import { Util } from "../../../src/shared/util";

// Test fixtures
const customProperties = {
    getProperty(prop: string) { return "" },
    setProperty(prop: string) { return "" },
};

const testContext: ICorrelationContext = {
    operation: {
        id: "test",
        name: undefined,
        parentId: undefined,
        traceparent: {
            // No support for legacyRootId
            legacyRootId: "",
            parentId: undefined,
            // Same as the id field
            traceId: "test",
            spanId: "test",
            traceFlag: "1",
            // Will always be version 00
            version: "00",
        },
        tracestate: { fieldmap: [""] }
    },
    customProperties
};

const testContext2: ICorrelationContext = {
    operation: {
        id: "test2",
        name: undefined,
        parentId: undefined,
        traceparent: {
            legacyRootId: "",
            parentId: undefined,
            traceId: "test2",
            spanId: "test2",
            traceFlag: "1",
            version: "00",
        },
        tracestate: { fieldmap: [""] }
    },
    customProperties
}

describe("CorrelationContextManager", () => {
    let sandbox: sinon.SinonSandbox;
    let diagWarnStub: sinon.SinonStub;
    let diagInfoStub: sinon.SinonStub;
    let diagErrorStub: sinon.SinonStub;
    let utilDumpObjStub: sinon.SinonStub;
    
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        
        // Stub diag methods to prevent console output during tests
        diagWarnStub = sandbox.stub(diag, 'warn');
        diagInfoStub = sandbox.stub(diag, 'info');
        diagErrorStub = sandbox.stub(diag, 'error');
        
        // Stub Util.dumpObj method
        utilDumpObjStub = sandbox.stub(Util.getInstance(), 'dumpObj').returns('error dump');
        
        // Ensure context is enabled before each test
        CorrelationContextManager.reset();
        CorrelationContextManager.enable();
    });
    
    afterEach(() => {
        sandbox.restore();
    });
    
    describe("#spanToContextObject", () => {
        it("should convert a SpanContext to an ICorrelationContext", () => {
            const testSpanContext: SpanContext = {
                traceId: "testtraceid",
                spanId: "testspanid",
                traceFlags: 1,
            };
            const parentId = "parentid123";
            const name = "testOperation";
            const traceState = new TraceState("key1=value1,key2=value2");
            
            const result = CorrelationContextManager.spanToContextObject(testSpanContext, parentId, name, traceState);
            
            assert.ok(result);
            assert.strictEqual(result.operation.name, name);
            assert.strictEqual(result.operation.id, testSpanContext.traceId);
            assert.strictEqual(result.operation.parentId, parentId);
            assert.deepStrictEqual(result.operation.tracestate.fieldmap, ["key1=value1", "key2=value2"]);
            assert.strictEqual(result.operation.traceparent.spanId, testSpanContext.spanId);
            assert.strictEqual(result.operation.traceparent.traceId, testSpanContext.traceId);
            assert.strictEqual(result.operation.traceparent.traceFlag, testSpanContext.traceFlags.toString());
        });
        
        it("should handle a null SpanContext", () => {
            const result = CorrelationContextManager.spanToContextObject(null);
            
            assert.ok(result);
            assert.strictEqual(result.operation.id, undefined);
            assert.strictEqual(result.operation.traceparent.traceId, undefined);
        });
    });
    
    describe("#generateContextObject", () => {
        it("should correctly generate a context object with all parameters", () => {
            const operationId = "operationId123";
            const parentId = "parentId456";
            const operationName = "testOperation";
            const traceparent: ITraceparent = {
                legacyRootId: "legacyId",
                parentId: parentId,
                traceId: operationId,
                spanId: "spanId789",
                traceFlag: "1",
                version: "00"
            };
            const tracestate = new TraceState("key1=value1,key2=value2");
            
            const result = CorrelationContextManager.generateContextObject(
                operationId,
                parentId,
                operationName,
                traceparent,
                tracestate
            );
            
            assert.ok(result);
            assert.strictEqual(result.operation.name, operationName);
            assert.strictEqual(result.operation.id, operationId);
            assert.strictEqual(result.operation.parentId, parentId);
            assert.deepStrictEqual(result.operation.traceparent, traceparent);
            assert.deepStrictEqual(result.operation.tracestate.fieldmap, ["key1=value1", "key2=value2"]);
        });
        
        it("should provide usable stub custom properties", () => {
            const operationId = "operationId123";
            const result = CorrelationContextManager.generateContextObject(operationId);
            
            assert.ok(result.customProperties);
            assert.strictEqual(typeof result.customProperties.getProperty, "function");
            assert.strictEqual(typeof result.customProperties.setProperty, "function");
            assert.strictEqual(result.customProperties.getProperty("someKey"), "");
        });
    });

    // Test getCurrentContext
    describe("#getCurrentContext", () => {
        it("should return the context if in a context", (done) => {
            CorrelationContextManager.runWithContext(testContext, () => {
                process.nextTick(() => {
                    assert.strictEqual(JSON.stringify(CorrelationContextManager.getCurrentContext()), JSON.stringify(testContext));
                    done();
                });
            });
        });

        it("should return the context if called by an asynchronous callback in a context", (done) => {
            CorrelationContextManager.runWithContext(testContext2, () => {
                process.nextTick(() => {
                    assert.strictEqual(JSON.stringify(CorrelationContextManager.getCurrentContext()), JSON.stringify(testContext2));
                    done();
                });
            });
        });

        it("should return the correct context to asynchronous callbacks occurring in parallel", (done) => {
            CorrelationContextManager.runWithContext(testContext, () => {
                process.nextTick(() => {
                    assert.strictEqual(JSON.stringify(CorrelationContextManager.getCurrentContext()), JSON.stringify(testContext));
                });
            });
            
            CorrelationContextManager.runWithContext(testContext2, () => {
                process.nextTick(() => {
                    assert.strictEqual(JSON.stringify(CorrelationContextManager.getCurrentContext()), JSON.stringify(testContext2));
                });
            });

            setTimeout(() => done(), 10);
        });
        
        it("should create a new span if no active span exists", () => {
            // Setup
            const testSpanContext: SpanContext = {
                traceId: "testtraceid",
                spanId: "testspanid",
                traceFlags: 1,
            };
            const startSpanStub = sandbox.stub().returns({
                spanContext: () => testSpanContext,
                name: "testSpan",
                parentSpanId: "parentId123"
            });
            const getTracerStub = sandbox.stub(trace, 'getTracer').returns({ startSpan: startSpanStub } as any);
            const getSpanStub = sandbox.stub(trace, 'getSpan').returns(null);
            
            // Execute
            const result = CorrelationContextManager.getCurrentContext();
            
            // Verify
            assert.ok(result);
            assert.ok(getTracerStub.calledOnce);
            assert.ok(startSpanStub.calledOnce);
        });
    });

    // Test runWithContext
    describe("#runWithContext", () => {
        it("should run the supplied function", () => {
            const fn = sinon.spy();
            CorrelationContextManager.runWithContext(testContext, fn);

            assert(fn.calledOnce);
        });
        
        it("should return the result of the supplied function", () => {
            const expectedResult = { success: true };
            const fn = () => expectedResult;
            
            const result = CorrelationContextManager.runWithContext(testContext, fn);
            
            assert.deepStrictEqual(result, expectedResult);
        });
        
        it("should handle errors in context binding", () => {
            // Setup
            const error = new Error("Test error");
            sandbox.stub(trace, 'setSpanContext').throws(error);
            const fn = sinon.spy();
            
            // Execute
            CorrelationContextManager.runWithContext(testContext, fn);
            
            // Verify
            assert.ok(fn.calledOnce);
            assert.ok(diagWarnStub.calledOnce);
            assert.ok(utilDumpObjStub.calledOnce);
        });
    });

    // Test wrapEmitter
    describe("#wrapEmitter", () => {
        it("should call context.bind with the emitter", () => {
            // Setup
            const emitter = new events.EventEmitter();
            const contextBindStub = sandbox.stub(context, 'bind');
            
            // Execute
            CorrelationContextManager.wrapEmitter(emitter);
            
            // Verify
            assert.ok(contextBindStub.calledOnce);
            assert.ok(contextBindStub.calledWith(sinon.match.any, emitter));
        });
        
        it("should handle errors when binding an emitter", () => {
            // Setup
            const emitter = new events.EventEmitter();
            const error = new Error("Binding error");
            sandbox.stub(context, 'bind').throws(error);
            
            // Execute
            CorrelationContextManager.wrapEmitter(emitter);
            
            // Verify
            assert.ok(diagWarnStub.calledOnce);
            assert.ok(utilDumpObjStub.calledOnce);
        });
        
        it("should preserve context across emitter events", (done) => {
            // Setup
            const emitter = new events.EventEmitter();
            
            // Execute
            CorrelationContextManager.runWithContext(testContext, () => {
                CorrelationContextManager.wrapEmitter(emitter);
                
                setTimeout(() => {
                    emitter.emit('test', 'data');
                }, 5);
            });
            
            // Listen for an event - should have the same context
            emitter.on('test', (data) => {
                const currentContext = CorrelationContextManager.getCurrentContext();
                assert.strictEqual(currentContext.operation.id, testContext.operation.id);
                done();
            });
        });
    });

    // Test wrapCallback
    describe("#wrapCallback", () => {
        it("should return a function that calls the supplied function", () => {
            const fn = sinon.spy();
            const wrappedFn = CorrelationContextManager.wrapCallback(fn);
            wrappedFn();

            assert.notEqual(wrappedFn, fn);
            assert(fn.calledOnce);
        });

        it("should return a function that restores the context at call-time into the supplied function", (done) => {
            let sharedFn = () => {
                assert.equal(JSON.stringify(CorrelationContextManager.getCurrentContext()), JSON.stringify(testContext));
            };

            CorrelationContextManager.runWithContext(testContext, () => {
                sharedFn = CorrelationContextManager.wrapCallback(sharedFn);
            });

            CorrelationContextManager.runWithContext(testContext2, () => {
                setTimeout(() => {
                    sharedFn();
                }, 8);
            });

            setTimeout(() => done(), 10);
        });
        
        it("should wrap callback with current context if no explicit context is provided", () => {
            // Setup
            const contextBindStub = sandbox.stub(context, 'bind').returns(() => {});
            const fn = () => {};
            
            // Execute
            CorrelationContextManager.runWithContext(testContext, () => {
                CorrelationContextManager.wrapCallback(fn);
            });
            
            // Verify
            assert.ok(contextBindStub.calledOnce);
            assert.ok(contextBindStub.calledWith(sinon.match.any, fn));
        });
        
        it("should handle errors when binding a callback", () => {
            // Setup
            const fn = () => {};
            const error = new Error("Binding error");
            sandbox.stub(context, 'bind').throws(error);
            
            // Execute
            const result = CorrelationContextManager.wrapCallback(fn);
            
            // Verify
            assert.strictEqual(result, fn);
            assert.ok(diagErrorStub.calledOnce);
            assert.ok(utilDumpObjStub.calledOnce);
        });
    });

    // Test startOperation
    describe("#startOperation", () => {
        const testSpanContext: SpanContext = {
            traceId: "testtraceid",
            spanId: "testspanid",
            traceFlags: 1,
        };

        const testFunctionTraceContext: azureFunctionTypes.TraceContext = {
            traceparent: "00-testtraceid-testspanid",
            tracestate: "key1=value1,key2=value2",
            attributes: {},
        };

        const testFunctionTraceContextV4: TraceContext = {
            traceParent: "00-testtraceid-testspanid",
            traceState: "key1=value1,key2=value2",
            attributes: {},
        };

        const testFunctionContextV4 = new InvocationContext({
            invocationId: "test",
            functionName: "",
            options: undefined,
            traceContext: testFunctionTraceContextV4,
        });

        const testFunctionContext: azureFunctionTypes.Context = {
            invocationId: "test",
            executionContext: {
                invocationId: '',
                functionName: '',
                functionDirectory: '',
                retryContext: undefined
            },
            bindings: {},
            bindingData: {
                invocationId: ''
            },
            traceContext: testFunctionTraceContext,
            bindingDefinitions: [],
            log: { error() { }, warn() { }, info() { }, verbose() { } } as azureFunctionTypes.Logger,
            done: () => { },
        };

        const testRequest: azureFunctionTypes.HttpRequest = {
            method: "GET",
            url: "/search",
            headers: {
                host: "bing.com",
                traceparent: testFunctionContext.traceContext.traceparent,
                tracestate: testFunctionContext.traceContext.tracestate,
            },
            query: { q: 'test' },
            params: {},
            user: null,
            body: {},
            rawBody: {},
            bufferBody: undefined,
            get(header: string) { return this.headers[header.toLowerCase()] },
            parseFormBody: undefined,
        };

        const testRequestHeadersV4: Record<string, string> = { 
            host: "bing.com", 
            traceparent: testFunctionContextV4.traceContext.traceParent,
            tracestate: testFunctionContextV4.traceContext.traceState 
        };
        
        const testRequestV4 = new HttpRequest({
            method: "GET",
            url: "http://bing.com/search",
            headers: testRequestHeadersV4,
            query: { q: 'test' },
            params: {},
            body: {},
        });

        describe("with Span input", () => {
            it("should start a new context using Span", () => {
                // Setup
                const mockSpan = {
                    spanContext: () => testSpanContext,
                    parentSpanContext: () => ({
                        traceId: "parentTraceId",
                        spanId: "parentSpanId",
                        traceFlags: 1,
                    }),
                    name: "testSpan",
                } as unknown as Span;
                
                // Execute
                const context = CorrelationContextManager.startOperation(mockSpan);
                
                // Verify
                assert.ok(context);
                assert.strictEqual(context.operation.id, testSpanContext.traceId);
                assert.strictEqual(context.operation.parentId, mockSpan.parentSpanContext.spanId);
            });
        });
        
        describe("with SpanContext input", () => {
            it("should start a new context using SpanContext", () => {
                const context = CorrelationContextManager.startOperation(testSpanContext);

                assert.ok(context.operation);
                assert.strictEqual(context.operation.id, testSpanContext.traceId);
            });
        });

        describe("#Azure Functions", () => {
            it("should start a new context with the 2nd arg http request", () => {
                const context = CorrelationContextManager.startOperation(testFunctionContext, testRequestV4);
                assert.ok(context.operation);
                assert.strictEqual(context.operation.id, testFunctionTraceContext.traceparent.split("-")[1]);
                assert.strictEqual(context.operation.parentId, testFunctionTraceContext.traceparent.split("-")[2]);
                assert.strictEqual(
                    `${context.operation.traceparent.version}-${context.operation.traceparent.traceId}-${context.operation.traceparent.spanId}`,
                    testFunctionTraceContext.traceparent
                );
            });

            it("should start a new context with 2nd arg string", () => {
                const context = CorrelationContextManager.startOperation(testFunctionContext, "GET /foo");
                assert.ok(context.operation);
                assert.strictEqual(context.operation.id, testFunctionTraceContext.traceparent.split("-")[1]);
                assert.strictEqual(context.operation.parentId, testFunctionTraceContext.traceparent.split("-")[2]);
                assert.strictEqual(
                    `${context.operation.traceparent.version}-${context.operation.traceparent.traceId}-${context.operation.traceparent.spanId}`,
                    testFunctionTraceContext.traceparent
                );
            });

            it("should start a new context with no request", () => {
                const context = CorrelationContextManager.startOperation(testFunctionContext);
                assert.ok(context.operation);
                assert.strictEqual(context.operation.id, testFunctionTraceContext.traceparent.split("-")[1]);
                assert.strictEqual(context.operation.parentId, testFunctionTraceContext.traceparent.split("-")[2]);
                assert.strictEqual(
                    `${context.operation.traceparent.version}-${context.operation.traceparent.traceId}-${context.operation.traceparent.spanId}`,
                    testFunctionTraceContext.traceparent
                );
            });
        });

        describe("#Azure Functions V4", () => {
            it("should start a new context with the 2nd arg http request", () => {
                const context = CorrelationContextManager.startOperation(testFunctionContextV4, testRequestV4);
                assert.ok(context.operation);
                assert.strictEqual(context.operation.id, testFunctionTraceContextV4.traceParent.split("-")[1]);
                assert.strictEqual(context.operation.parentId, testFunctionTraceContextV4.traceParent.split("-")[2]);
                assert.strictEqual(
                    `${context.operation.traceparent.version}-${context.operation.traceparent.traceId}-${context.operation.traceparent.spanId}`,
                    testFunctionTraceContextV4.traceParent
                );
            });

            it("should start a new context with 2nd arg string", () => {
                const context = CorrelationContextManager.startOperation(testFunctionContextV4, "GET /foo");
                assert.ok(context.operation);
                assert.strictEqual(context.operation.id, testFunctionTraceContextV4.traceParent.split("-")[1]);
                assert.strictEqual(context.operation.parentId, testFunctionTraceContextV4.traceParent.split("-")[2]);
                assert.strictEqual(
                    `${context.operation.traceparent.version}-${context.operation.traceparent.traceId}-${context.operation.traceparent.spanId}`,
                    testFunctionTraceContextV4.traceParent
                );
            });

            it("should start a new context with no request", () => {
                const context = CorrelationContextManager.startOperation(testFunctionContextV4, "GET /test");
                assert.ok(context.operation);
                assert.strictEqual(context.operation.id, testFunctionTraceContextV4.traceParent.split("-")[1]);
                assert.strictEqual(context.operation.parentId, testFunctionTraceContextV4.traceParent.split("-")[2]);
                assert.strictEqual(
                    `${context.operation.traceparent.version}-${context.operation.traceparent.traceId}-${context.operation.traceparent.spanId}`,
                    testFunctionTraceContextV4.traceParent
                );
            });
        });

    describe("#headers", () => {
        it("should start a new context using the headers from an HTTP request", () => {
            const context = CorrelationContextManager.startOperation(testRequest, "GET /test");
                assert.ok(context.operation);
                assert.strictEqual(context.operation.id, testFunctionTraceContext.traceparent.split("-")[1]);
                assert.strictEqual(context.operation.parentId, testFunctionTraceContext.traceparent.split("-")[2]);
                assert.strictEqual(
                    `${context.operation.traceparent.version}-${context.operation.traceparent.traceId}-${context.operation.traceparent.spanId}`,
                    testFunctionTraceContext.traceparent
                );
            });
            
            it("should handle HTTP request with request-id fallback", () => {
                // Setup
                const mockHeaders = {
                    get: sandbox.stub()
                };
                mockHeaders.get.withArgs("traceparent").returns(null);
                mockHeaders.get.withArgs("request-id").returns("00-requestid-requestparent-01");
                
                const mockRequest = {
                    headers: mockHeaders
                };
                
                // Execute
                const context = CorrelationContextManager.startOperation(mockRequest as any);
                
                // Verify
                assert.ok(context);
                assert.strictEqual(context.operation.id, "requestid");
                assert.strictEqual(context.operation.parentId, "requestparent");
            });
            
            it("should warn when invalid arguments are provided", () => {
                // Execute
                const context = CorrelationContextManager.startOperation(null);
                
                // Verify
                assert.strictEqual(context, null);
                assert.ok(diagWarnStub.calledWith("startOperation was called with invalid arguments"));
            });
        });
    });
   
    // This test must occur last as it will disable context
    describe("#Context.Disable", () => {
        it("should return null if the context is disabled", () => {
            CorrelationContextManager.disable();
            assert.strictEqual(CorrelationContextManager.getCurrentContext(), null);
        });
    });
});
