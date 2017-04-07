import { CorrelationContextManager, CorrelationContext } from "../../AutoCollection/CorrelationContextManager";

import assert = require("assert");
import sinon = require("sinon");

if (CorrelationContextManager.isNodeVersionCompatible()) {
    describe("AutoCollection/CorrelationContextManager", () => {
        var testContext: CorrelationContext = {
            operation: {
                id: "test",
                name: "test",
                parentId: "test"
            },
            customProperties: {}
        };
        var testContext2: CorrelationContext = {
            operation: {
                id: "test2",
                name: "test2",
                parentId: "test2"
            },
            customProperties: {}
        };

        describe("#getCurrentContext()", () => {
            afterEach(()=>{
                // Mocha's async "done" methods cause future tests to be in the same context chain
                // Reset the context each time
                CorrelationContextManager.enable();
                CorrelationContextManager.runWithContext(null, ()=>null);
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

                CorrelationContextManager.runWithContext(testContext, ()=>{
                    CorrelationContextManager.disable();
                    assert.equal(CorrelationContextManager.getCurrentContext(), null);
                    done();
                });
            });
            it("should return the context if in a context", (done) => {
                CorrelationContextManager.enable();

                CorrelationContextManager.runWithContext(testContext, ()=>{
                    assert.equal(CorrelationContextManager.getCurrentContext(), testContext);
                    done();
                });
            });
            it("should return the context if called by an asynchronous callback in a context", (done) => {
                CorrelationContextManager.enable();

                CorrelationContextManager.runWithContext(testContext, ()=>{
                    process.nextTick(()=>{
                        assert.equal(CorrelationContextManager.getCurrentContext(), testContext);
                        done();
                    });
                });
            });
            it("should return the correct context to asynchronous callbacks occuring in parallel", (done) => {
                CorrelationContextManager.enable();

                CorrelationContextManager.runWithContext(testContext, ()=>{
                    process.nextTick(()=>{
                        assert.equal(CorrelationContextManager.getCurrentContext(), testContext);
                    });
                });

                CorrelationContextManager.runWithContext(testContext2, ()=>{
                    process.nextTick(()=>{
                        assert.equal(CorrelationContextManager.getCurrentContext(), testContext2);
                    });
                });

                setTimeout(()=>done(), 10);
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

                var sharedFn = ()=> {
                    assert.equal(CorrelationContextManager.getCurrentContext(), testContext);
                };

                CorrelationContextManager.runWithContext(testContext, ()=>{
                    sharedFn = CorrelationContextManager.wrapCallback(sharedFn);
                });

                CorrelationContextManager.runWithContext(testContext2, ()=>{
                    setTimeout(()=>{
                        sharedFn();
                    }, 8);
                });

                setTimeout(()=>done(), 10);
            });
        });
    });
} else {
    describe("AutoCollection/CorrelationContextManager[IncompatibleVersion!]", () => {
        var testContext: CorrelationContext = {
            operation: {
                id: "test",
                name: "test",
                parentId: "test"
            },
            customProperties: {}
        };
        var testContext2: CorrelationContext = {
            operation: {
                id: "test2",
                name: "test2",
                parentId: "test2"
            },
            customProperties: {}
        };

        describe("#getCurrentContext()", () => {
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

                CorrelationContextManager.runWithContext(testContext, ()=>{
                    CorrelationContextManager.disable();
                    assert.equal(CorrelationContextManager.getCurrentContext(), null);
                    done();
                });
            });
            it("should return null if in a context", (done) => {
                CorrelationContextManager.enable();

                CorrelationContextManager.runWithContext(testContext, ()=>{
                    assert.equal(CorrelationContextManager.getCurrentContext(), null);
                    done();
                });
            });
            it("should return null if called by an asynchronous callback in a context", (done) => {
                CorrelationContextManager.enable();

                CorrelationContextManager.runWithContext(testContext, ()=>{
                    process.nextTick(()=>{
                        assert.equal(CorrelationContextManager.getCurrentContext(), null);
                        done();
                    });
                });
            });
            it("should return null to asynchronous callbacks occuring in parallel", (done) => {
                CorrelationContextManager.enable();

                CorrelationContextManager.runWithContext(testContext, ()=>{
                    process.nextTick(()=>{
                        assert.equal(CorrelationContextManager.getCurrentContext(), null);
                    });
                });

                CorrelationContextManager.runWithContext(testContext2, ()=>{
                    process.nextTick(()=>{
                        assert.equal(CorrelationContextManager.getCurrentContext(), null);
                    });
                });

                setTimeout(()=>done(), 10);
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
            it("should return the supplied function if enabled", () => {
                CorrelationContextManager.enable();
                var fn = sinon.spy();

                var wrapped = CorrelationContextManager.wrapCallback(fn);

                assert.equal(wrapped, fn);
            });
            it("should not return a function that restores a null context at call-time into the supplied function if enabled", (done) => {
                CorrelationContextManager.enable();

                var sharedFn = ()=> {
                    assert.equal(CorrelationContextManager.getCurrentContext(), null);
                };

                CorrelationContextManager.runWithContext(testContext, ()=>{
                    sharedFn = CorrelationContextManager.wrapCallback(sharedFn);
                });

                CorrelationContextManager.runWithContext(testContext2, ()=>{
                    setTimeout(()=>{
                        sharedFn();
                    }, 8);
                });

                setTimeout(()=>done(), 10);
            });
        });
    });
}
