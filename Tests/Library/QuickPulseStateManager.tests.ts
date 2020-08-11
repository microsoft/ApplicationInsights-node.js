import assert = require("assert");
import sinon = require("sinon");

import QuickPulseClient = require("../../Library/QuickPulseStateManager");
import { AssertionError } from "assert";

describe("Library/QuickPulseStateManager", () => {
    describe("#constructor", () => {
        let qps;
        afterEach(() => {
            qps = null;
        });

        it("should create a config with ikey", () => {
            qps = new QuickPulseClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");

            assert.ok(qps.config);
            assert.equal(qps.config.instrumentationKey, "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            assert.ok(qps.context);
            assert.equal(qps["_isEnabled"], false);
            assert.equal(qps["_isCollectingData"], false);
            assert.ok(qps["_sender"]);
            assert.ok(Object.keys(qps["_metrics"]).length === 0);
            assert.ok(qps["_documents"].length === 0);
            assert.ok(qps["_collectors"].length === 0);
        });

    });

    describe("#enable", () => {
        let qps: QuickPulseClient;

        beforeEach(() => {
            qps = new QuickPulseClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
        })
        afterEach(() => {
            qps = null;
        });
        it("should call _goQuickPulse() when isEnabled == true", () => {
            const qpsStub = sinon.stub(qps, "_goQuickPulse");

            assert.ok(qpsStub.notCalled);
            qps.enable(true);
            assert.ok(qpsStub.calledOnce);
            assert.equal(qps["_isEnabled"], true);

            qpsStub.restore();
        });

        it("should clear timeout handle when isEnabled == false", () => {
            assert.equal(qps["_handle"], undefined);
            qps["_isEnabled"] = true;
            (<any>qps["_handle"]) = setTimeout(()=>{ throw new Error("this error should be cancelled") }, 1000);
            <any>qps["_handle"].unref();
            assert.ok(qps["_handle"]);

            qps.enable(false);
            assert.equal(qps["_handle"], undefined);
            assert.equal(qps["_isEnabled"], false);
        })
    });

    describe("#reset", () => {
        it("should reset metric and document buffers", () => {
            let qps = new QuickPulseClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            (<any>qps["_metrics"]) = {foo: "bar"};
            (<any>qps["_documents"]) = [{foo: "bar"}];

            assert.ok(qps["_metrics"].foo);
            assert.ok(qps["_documents"].length > 0)
            assert.ok((<any>qps["_documents"][0]).foo);

            qps["_resetQuickPulseBuffer"]();
            assert.ok(!qps["_metrics"].foo);
            assert.ok(qps["_documents"].length === 0)
        })
    });

    describe("#_goQuickPulse", () => {
        let qps: QuickPulseClient;
        let postStub: sinon.SinonStub;
        let pingStub: sinon.SinonStub;

        beforeEach(() => {
            qps = new QuickPulseClient("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            postStub = sinon.stub(qps, "_post");
            pingStub = sinon.stub(qps, "_ping");
        })
        afterEach(() => {
            qps = null;
            postStub.restore();
            pingStub.restore();
        });

        it("should call _ping when not collecting data", () => {
            qps.enable(true)

            assert.ok(pingStub.calledOnce);
            assert.ok(postStub.notCalled);

            qps.enable(false);
        });

        it("should call _post when collecting data", () => {
            assert.ok(pingStub.notCalled);
            assert.ok(postStub.notCalled);

            qps["_isCollectingData"] = true;
            qps.enable(true)

            assert.ok(postStub.calledOnce);
            assert.ok(pingStub.notCalled);

            qps.enable(false);
        });
    });
});
