import { CorrelationContextManager } from "../../AutoCollection/CorrelationContextManager";
import * as azureFunctionTypes from "../../Library/Functions";
import { ICorrelationContext } from "../../Declarations/Interfaces";

import assert = require("assert");
import sinon = require("sinon");
import { SpanContext } from "@opentelemetry/api";

const customProperties = {
    getProperty(prop: string) { return "" },
    setProperty(prop: string, val: string) { },
}

describe("AutoCollection/CorrelationContextManager", () => {
    var testContext: ICorrelationContext = {
        operation: {
            id: "test",
            name: "test",
            parentId: "test"
        },
        customProperties
    };
    var testContext2: ICorrelationContext = {
        operation: {
            id: "test2",
            name: "test2",
            parentId: "test2"
        },
        customProperties
    };

    describe("#getCurrentContext()", () => {
        afterEach(() => {
            // Mocha's async "done" methods cause future tests to be in the same context chain
            // Reset the context each time
            CorrelationContextManager.reset();
            assert.equal(null, CorrelationContextManager.getCurrentContext());
        });
        it("should return null if not in a context", () => {
            CorrelationContextManager.enable();

            assert.equal(CorrelationContextManager.getCurrentContext(), null);
        });
        it("should return null if the ContextManager is disabled (outside context)", () => {
            CorrelationContextManager.disable();

            assert.equal(CorrelationContextManager.getCurrentContext(), null);
        });
        it("should return null if the ContextManager is disabled (inside context)", (done) => {
            CorrelationContextManager.enable();

            CorrelationContextManager.runWithContext(testContext, () => {
                CorrelationContextManager.disable();
                assert.equal(CorrelationContextManager.getCurrentContext(), null);
                done();
            });
        });
        it("should return the context if in a context", (done) => {
            CorrelationContextManager.enable();

            CorrelationContextManager.runWithContext(testContext, () => {
                assert.equal(CorrelationContextManager.getCurrentContext(), testContext);
                done();
            });
        });
        it("should return the context if called by an asynchronous callback in a context", (done) => {
            CorrelationContextManager.enable();

            CorrelationContextManager.runWithContext(testContext2, () => {
                process.nextTick(() => {
                    assert.equal(CorrelationContextManager.getCurrentContext(), testContext2);
                    done();
                });
            });
        });
        it("should return the correct context to asynchronous callbacks occuring in parallel", (done) => {
            CorrelationContextManager.enable();

            CorrelationContextManager.runWithContext(testContext, () => {
                process.nextTick(() => {
                    assert.equal(CorrelationContextManager.getCurrentContext(), testContext);
                });
            });

            CorrelationContextManager.runWithContext(testContext2, () => {
                process.nextTick(() => {
                    assert.equal(CorrelationContextManager.getCurrentContext(), testContext2);
                });
            });

            setTimeout(() => done(), 10);
        });
    });

    describe("#AppInsightsAsyncCorrelatedErrorWrapper", () => {
        it("should not crash if prepareStackTrace is used", () => {
            CorrelationContextManager.enable();

            try {
                var stackTrace = (<any>Error)['prepareStackTrace'];
                (<any>Error)['prepareStackTrace'] = function (_: any, stack: any) {
                    (<any>Error)['prepareStackTrace'] = stackTrace;
                    return stack;
                };

                var error = new Error();
                assert(<any>error.stack instanceof Array);
            } catch (e) {
                assert(false);
            }
        });
        it("should remove extra AI+Zone methods if prepareStackTrace is used", () => {
            CorrelationContextManager.enable();

            var stackTrace = (<any>Error)['prepareStackTrace'];
            (<any>Error)['prepareStackTrace'] = function (_: any, stack: any) {
                (<any>Error)['prepareStackTrace'] = stackTrace;
                return stack;
            };

            var error = new Error();
            var topOfStack = (<any>error.stack)[0].getFileName();
            assert(topOfStack.indexOf("CorrelationContextManager.tests.js") !== -1, "Top of stack not expected to be " + topOfStack);
        });
        it("should not crash on missing filename", () => {
            CorrelationContextManager.enable();

            var stackTrace = (<any>Error)['prepareStackTrace'];
            (<any>Error)['prepareStackTrace'] = function (_: any, stack: any): any[] {
                return stack;
            };

            var error = new Error();
            try {
                (<any>Error)['prepareStackTrace'](null, [{ getFunctionName: () => '', getFileName: (): any => null }]);
                (<any>Error)['prepareStackTrace'] = stackTrace;
            } catch (e) {
                (<any>Error)['prepareStackTrace'] = stackTrace;
                assert(false, "prepareStackTrace should not throw. Threw: " + e);
            }
        });
    });

    describe("#runWithContext()", () => {
        it("should run the supplied function", () => {
            CorrelationContextManager.enable();
            var fn = sinon.spy();

            CorrelationContextManager.runWithContext(testContext, fn);

            assert(fn.calledOnce);
        });
    });

    describe("#wrapCallback()", () => {
        it("should return the supplied function if disabled", () => {
            CorrelationContextManager.disable();
            var fn = sinon.spy();

            var wrapped = CorrelationContextManager.wrapCallback(fn);

            assert.equal(wrapped, fn);
        });
        it("should return a function that calls the supplied function if enabled", () => {
            CorrelationContextManager.enable();
            var fn = sinon.spy();

            var wrapped = CorrelationContextManager.wrapCallback(fn);
            wrapped();

            assert.notEqual(wrapped, fn);
            assert(fn.calledOnce);
        });
        it("should return a function that restores the context available at call-time into the supplied function if enabled", (done) => {
            CorrelationContextManager.enable();

            var sharedFn = () => {
                assert.equal(CorrelationContextManager.getCurrentContext(), testContext);
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
    });

    describe("#startOperation()", () => {
        const spanContext: SpanContext = {
            traceId: '5e84aff3af474588a42dcbf3bd1db95f',
            spanId: '1fc066fb77fa43a3',
            traceFlags: 0
        };
        const functionContext: azureFunctionTypes.TraceContext = {
            traceparent: "00-5e84aff3af474588a42dcbf3bd1db95f-1fc066fb77fa43a3-00",
            tracestate: "",
            attributes: {},
        };

        const request = {
            method: "GET",
            url: "/search",
            connection: {
                encrypted: false
            },
            headers: {
                host: "bing.com",
                traceparent: functionContext.traceparent,
            },
            query: { q: 'test' },
            params: {}
        };

        describe("#SpanContext", () => {
            it("should start a new context", () => {
                const context = CorrelationContextManager.startOperation(spanContext, "GET /example");

                assert.ok(context.operation);
                assert.deepEqual(context.operation.id, spanContext.traceId);
                assert.deepEqual(context.operation.parentId, `|${spanContext.traceId}.${spanContext.spanId}.`);
                assert.deepEqual(context.operation.name, "GET /example");
            });
        });
    });
});