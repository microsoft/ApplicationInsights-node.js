import { CorrelationContextManager } from '../../../src/shim/correlationContextManager';
import { ICorrelationContext } from "../../../src/shim/types";
import assert = require("assert");
import sinon = require("sinon");
import { SpanContext } from "@opentelemetry/api";
import * as azureFunctionTypes from "@azure/functions";


const customProperties = {
    getProperty(prop: string) { return "" },
    setProperty(prop: string) { return "" },
}

const testContext: ICorrelationContext = {
    operation: {
        id: "test",
        name: undefined,
        // TODO: parentId cannot be passed in the spanContext object - determine if this can navigated around
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
        tracestate: { fieldmap: undefined }
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
        tracestate: { fieldmap: undefined }
    },
    customProperties
}

// Test getCurrentContext
describe("#getCurrentContext()", () => {
    it("should return the context if in a context", (done) => {
        CorrelationContextManager.runWithContext(testContext, () => {
            assert.strictEqual(JSON.stringify(CorrelationContextManager.getCurrentContext()), JSON.stringify(testContext));
            done();
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

    const testFunctionContext: azureFunctionTypes.TraceContext = {
        traceparent: "00-testtraceid-testspanid-00",
        tracestate: "",
        attributes: {},
    };

    const testRequest = {
        method: "GET",
        url: "/search",
        headers: {
            host: "bing.com",
            traceparent: testFunctionContext.traceparent,
        },
        query: { q: 'test' },
        params: {}
    };
});
