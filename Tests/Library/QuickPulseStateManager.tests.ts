import assert = require("assert");
import sinon = require("sinon");

import QuickPulseClient = require("../../Library/QuickPulseStateManager");
import { IncomingMessage } from "http";
import Config = require("../../Library/Config");

describe("Library/QuickPulseStateManager", () => {
    describe("#constructor", () => {
        let qps;
        afterEach(() => {
            qps = null;
        });

        it("should create a config with ikey", () => {
            qps = new QuickPulseClient(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));

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
            qps = new QuickPulseClient(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
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
            (<any>qps["_handle"]) = setTimeout(() => { throw new Error("this error should be cancelled") }, 1000);
            <any>qps["_handle"].unref();
            assert.ok(qps["_handle"]);

            qps.enable(false);
            assert.equal(qps["_handle"], undefined);
            assert.equal(qps["_isEnabled"], false);
        })
    });

    describe("#reset", () => {
        it("should reset metric and document buffers", () => {
            let qps = new QuickPulseClient(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
            (<any>qps["_metrics"]) = { foo: "bar" };
            (<any>qps["_documents"]) = [{ foo: "bar" }];

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
            qps = new QuickPulseClient(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
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

    describe("#_goQuickPulsePingPollingHint", () => {
        let qps: QuickPulseClient;
        let postStub: sinon.SinonStub;
        let pingStub: sinon.SinonStub;
        let clock: sinon.SinonFakeTimers;

        beforeEach(() => {
            clock = sinon.useFakeTimers();
            qps = new QuickPulseClient(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
            postStub = sinon.stub(qps, "_post");
            pingStub = sinon.stub(qps, "_ping");
        })
        afterEach(() => {
            qps = null;
            postStub.restore();
            pingStub.restore();
            clock.restore();
        });

        it("should call _ping at once every 5000ms when no pollingIntervalHint is set", () => {
            qps.enable(true);

            clock.tick(10000);
            assert.equal(pingStub.callCount, 3);
            assert.ok(postStub.notCalled);
            qps.enable(false);
        });


        it("should call _ping at a rate according to interval hint", () => {
            qps["_pollingIntervalHint"] = 1000;
            qps.enable(true);

            clock.tick(10000);
            assert.equal(pingStub.callCount, 11);
            assert.ok(postStub.notCalled);
            qps.enable(false);
        });
    });

    describe("#_goQuickPulsePingWithAllHeaders", () => {
        let qps: QuickPulseClient;
        let submitDataStub: sinon.SinonStub;
        let clock: sinon.SinonFakeTimers;

        beforeEach(() => {
            clock = sinon.useFakeTimers();
            qps = new QuickPulseClient(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
            submitDataStub = sinon.stub(qps['_sender'], "_submitData");
        })
        afterEach(() => {
            qps = null;
            submitDataStub.restore();
            clock.restore();
        });

        it("should call _ping with all expected headers set set", () => {
            qps['context'].tags[qps['context'].keys.cloudRoleInstance] = 'instance1';
            qps['context'].tags[qps['context'].keys.cloudRole] = 'role1';
            qps.enable(true);

            let callArgs = submitDataStub.args;
            assert.equal((callArgs[0][4][0] as any)['name'], 'x-ms-qps-stream-id');
            assert.ok((callArgs[0][4][0] as any)['value'].length > 0);
            assert.equal((callArgs[0][4][1] as any)['name'], 'x-ms-qps-machine-name');
            assert.ok((callArgs[0][4][1] as any)['value'].length > 0);
            assert.equal((callArgs[0][4][2] as any)['name'], 'x-ms-qps-role-name');
            assert.equal((callArgs[0][4][2] as any)['value'], 'role1');
            assert.equal((callArgs[0][4][3] as any)['name'], 'x-ms-qps-instance-name');
            assert.equal((callArgs[0][4][3] as any)['value'], 'instance1');
            assert.equal((callArgs[0][4][4] as any)['name'], 'x-ms-qps-invariant-version');
            assert.equal((callArgs[0][4][4] as any)['value'], '1');

            assert.equal(submitDataStub.callCount, 1);

            qps.enable(false);
        });

        it("should call _ping with all expected headers set", () => {
            qps.enable(true);
            qps['_redirectedHost'] = 'www.example.com';

            let callArgs = submitDataStub.args;

            clock.tick(10000);

            qps.enable(false);

            assert.equal(submitDataStub.callCount, 3);
            assert.equal(callArgs[0][1], undefined);
            assert.equal(callArgs[1][1], 'www.example.com');
            assert.equal(callArgs[2][1], 'www.example.com');

        });
    });

    describe("#_goQuickPulse", () => {
        let qps: QuickPulseClient;

        beforeEach(() => {
            qps = new QuickPulseClient(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));

        })
        afterEach(() => {
            qps = null;
        });

        it("should call _quickPulseDone and set the _rediectedHost and pollingIntervalHint", () => {

            qps['_quickPulseDone'](true, { statusCode: 200 } as IncomingMessage, 'www.example.com', 2000);

            assert.equal(qps['_redirectedHost'], 'www.example.com');
            assert.equal(qps['_pollingIntervalHint'], 2000);
            assert.equal(qps['_isCollectingData'], true);
            assert.equal(qps['_lastSendSucceeded'], true);
        });

        it("should call _quickPulseDone and not set the _rediectedHost and pollingIntervalHint if the arguments are null", () => {
            qps['_pollingIntervalHint'] = 2000;
            qps['_redirectedHost'] = 'www.example.com';
            qps['_quickPulseDone'](true, { statusCode: 200 } as IncomingMessage, null, 0);

            assert.equal(qps['_redirectedHost'], 'www.example.com');
            assert.equal(qps['_pollingIntervalHint'], 2000);

            qps['_quickPulseDone'](true, { statusCode: 200 } as IncomingMessage, 'www.quickpulse.com', 5000);

            assert.equal(qps['_redirectedHost'], 'www.quickpulse.com');
            assert.equal(qps['_pollingIntervalHint'], 5000);
        });
    });
});
