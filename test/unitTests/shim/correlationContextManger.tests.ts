// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import assert = require("assert");
import sinon = require("sinon");
import { SpanContext } from "@opentelemetry/api";
import * as azureFunctionTypes from "@azure/functions-old";
import { CorrelationContextManager } from '../../../src/shim/correlationContextManager';
import { ICorrelationContext } from "../../../src/shim/types";
import { HttpRequest, InvocationContext, TraceContext } from "@azure/functions";
import { FormData, Headers, SpecIterableIterator, SpecIterator } from "undici";
import { Blob } from "buffer";
import { spec } from "node:test/reporters";


const customProperties = {
    getProperty(prop: string) { return "" },
    setProperty(prop: string) { return "" },
}

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

// Test getCurrentContext
describe("#getCurrentContext()", () => {
    it("should return the context if in a context", (done) => {
        CorrelationContextManager.runWithContext(testContext, () => {
                process.nextTick(() => {
                    assert.strictEqual(JSON.stringify(CorrelationContextManager.getCurrentContext()), JSON.stringify(testContext));
                    done();
                });
            });
    });

    it("should return the context if called by an asychronous callback in a context", (done) => {
        CorrelationContextManager.runWithContext(testContext2, () => {
            process.nextTick(() => {
                assert.strictEqual(JSON.stringify(CorrelationContextManager.getCurrentContext()), JSON.stringify(testContext2));
                done();
            });
        });
    });

    it("should return the correct context to asynchronous callbacks occuring in parellel", (done) => {
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
});

// Test runWithContext
describe("#runWithContext()", () => {
    it("should run the supplied function", () => {
        CorrelationContextManager.enable();
        const fn = sinon.spy();
        CorrelationContextManager.runWithContext(testContext, fn);

        assert(fn.calledOnce);
    });
});

// Test wrapEmitter

// Test wrapCallback
describe("#wrapCallback()", () => {
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
        }

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
});

// Test startOperation
describe("#startOperation()", () => {
    const testSpanContext: SpanContext = {
        traceId: "testtraceid",
        spanId: "testspanid",
        traceFlags: 0,
    };

    const testFunctionTraceContext: azureFunctionTypes.TraceContext = {
        traceparent: "00-testtraceid-testspanid",
        tracestate: "",
        attributes: {},
    };

    const testFunctionTraceContextV4: TraceContext = {
        traceParent: "00-testtraceid-testspanid",
        traceState: "",
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

    const testRequestHeadersV4: Record<string, string> = { host: "bing.com", traceparent: testFunctionContextV4.traceContext.traceParent };
    
    const testRequestV4 = new HttpRequest({
        method: "GET",
        url: "http://bing.com/search",
        headers: testRequestHeadersV4,
        query: { q: 'test' },
        params: {},
        body: {},
    });

    describe("#Azure Functions", () => {
        it("should start a new context with the 2nd arg http request", () => {
            const context = CorrelationContextManager.startOperation(testFunctionContext, testRequestV4);
            assert.ok(context.operation);
            assert.deepEqual(context.operation.id, testFunctionTraceContext.traceparent.split("-")[1]);
            assert.deepEqual(context.operation.parentId, testFunctionTraceContext.traceparent.split("-")[2]);
            assert.deepEqual(
                `${context.operation.traceparent.version}-${context.operation.traceparent.traceId}-${context.operation.traceparent.spanId}`,
                testFunctionTraceContext.traceparent
            );
        });

        it("should start a new context with 2nd arg string", () => {
            const context = CorrelationContextManager.startOperation(testFunctionContext, "GET /foo");
            assert.ok(context.operation);
            assert.deepEqual(context.operation.id, testFunctionTraceContext.traceparent.split("-")[1]);
            assert.deepEqual(context.operation.parentId, testFunctionTraceContext.traceparent.split("-")[2]);
            assert.deepEqual(
                `${context.operation.traceparent.version}-${context.operation.traceparent.traceId}-${context.operation.traceparent.spanId}`,
                testFunctionTraceContext.traceparent
            );
        });

        it("should start a new context with no request", () => {
            const context = CorrelationContextManager.startOperation(testFunctionContext, "GET /test");
            assert.ok(context.operation);
            assert.deepEqual(context.operation.id, testFunctionTraceContext.traceparent.split("-")[1]);
            assert.deepEqual(context.operation.parentId, testFunctionTraceContext.traceparent.split("-")[2]);
            assert.deepEqual(
                `${context.operation.traceparent.version}-${context.operation.traceparent.traceId}-${context.operation.traceparent.spanId}`,
                testFunctionTraceContext.traceparent
            );
        });
    });

    describe("#Azure Functions V4", () => {
        it("should start a new context with the 2nd arg http request", () => {
            const context = CorrelationContextManager.startOperation(testFunctionContextV4, testRequestV4);
            assert.ok(context.operation);
            assert.deepEqual(context.operation.id, testFunctionTraceContextV4.traceParent.split("-")[1]);
            assert.deepEqual(context.operation.parentId, testFunctionTraceContextV4.traceParent.split("-")[2]);
            assert.deepEqual(
                `${context.operation.traceparent.version}-${context.operation.traceparent.traceId}-${context.operation.traceparent.spanId}`,
                testFunctionTraceContextV4.traceParent
            );
        });

        it("should start a new context with 2nd arg string", () => {
            const context = CorrelationContextManager.startOperation(testFunctionContextV4, "GET /foo");
            assert.ok(context.operation);
            assert.deepEqual(context.operation.id, testFunctionTraceContextV4.traceParent.split("-")[1]);
            assert.deepEqual(context.operation.parentId, testFunctionTraceContextV4.traceParent.split("-")[2]);
            assert.deepEqual(
                `${context.operation.traceparent.version}-${context.operation.traceparent.traceId}-${context.operation.traceparent.spanId}`,
                testFunctionTraceContextV4.traceParent
            );
        });

        it("should start a new context with no request", () => {
            const context = CorrelationContextManager.startOperation(testFunctionContextV4, "GET /test");
            assert.ok(context.operation);
            assert.deepEqual(context.operation.id, testFunctionTraceContextV4.traceParent.split("-")[1]);
            assert.deepEqual(context.operation.parentId, testFunctionTraceContextV4.traceParent.split("-")[2]);
            assert.deepEqual(
                `${context.operation.traceparent.version}-${context.operation.traceparent.traceId}-${context.operation.traceparent.spanId}`,
                testFunctionTraceContextV4.traceParent
            );
        });
    });

    describe("#SpanContext", () => {
        it("should start a new context using SpanContext", () => {
            const context = CorrelationContextManager.startOperation(testSpanContext, "GET /test");

            assert.ok(context.operation);
            assert.deepEqual(context.operation.id, testSpanContext.traceId);
            assert.deepEqual(context.operation.parentId, context.operation.parentId);
        });
    });

    describe("#headers", () => {
        it("should start a new context using the headers from an HTTP request", () => {
            const context = CorrelationContextManager.startOperation(testRequest, "GET /test");

            assert.ok(context.operation);
            assert.deepEqual(context.operation.id, testFunctionTraceContext?.traceparent?.split("-")[1]);
            assert.deepEqual(context.operation.parentId, testFunctionTraceContext.traceparent.split("-")[2]);
            assert.deepEqual(
                `${context.operation.traceparent.version}-${context.operation.traceparent.traceId}-${context.operation.traceparent.spanId}`,
                testFunctionTraceContext.traceparent
            );
        });
    });

    /**
     * This test must occur last as it will disable context
     */
    describe("#Context.Disable", () => {
        it("should return null if the context is disabled", () => {
            CorrelationContextManager.disable();
            assert.strictEqual(CorrelationContextManager.getCurrentContext(), null);
        });
    });
});
