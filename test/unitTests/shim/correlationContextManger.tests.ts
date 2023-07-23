import { CorrelationContextManager } from '../../../src/shim/correlationContextManager';
import { ICorrelationContext, HttpRequest } from "../../../src/shim/types";
import assert = require("assert");


const customProperties = {
    getProperty(prop: string) { return "" },
    setProperty(prop: string) { return "" },
}

const testContext: ICorrelationContext = {
    operation: {
        id: "test1",
        name: undefined,
        // TODO: parentId cannot be passed in the spanContext object - determine if this can navigated around
        parentId: undefined,
        traceparent: {
            // No support for legacyRootId
            legacyRootId: "",
            parentId: undefined,
            spanId: "test4",
            traceFlag: "1",
            // Same as the id field
            traceId: "test1",
            // Will always be version 00
            version: "00",
        },
        tracestate: { fieldmap: [undefined] }
    },
    customProperties
};

// Test getCurrentContext
describe("#getCurrentContext()", () => {
    it("should return the context if in a context", (done) => {
        CorrelationContextManager.runWithContext(testContext, () => {
            assert.notStrictEqual(CorrelationContextManager.getCurrentContext(), testContext);
            done();
        });
    })
})

// Test runWithContext

// Test wrapEmitter

// Test wrapCallback

// Test startOperation
