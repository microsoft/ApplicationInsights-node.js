///<reference path="..\..\Declarations\node\node.d.ts" />
///<reference path="..\..\Declarations\mocha\mocha.d.ts" />
///<reference path="..\..\Declarations\sinon\sinon.d.ts" />

import assert = require("assert");
import sinon = require("sinon");

import Channel = require("../../Library/Channel");
import Contracts = require("../../Library/Contracts");

class ChannelMock extends Channel {
    public getBuffer() {
        return this._buffer;
    }

    public getTimeoutHandle() {
        return this._timeoutHandle;
    }
}

describe("Library/Channel", () => {

    var testEnvelope = new Contracts.Contracts.Envelope();
    var sender = {
        saveOnCrash: (str) => null,
        send: (Buffer) => null
    };

    var sendSpy = sinon.spy(sender, "send");
    var saveSpy = sinon.spy(sender, "saveOnCrash");

    var channel:ChannelMock;
    var config;
    var clock;
    before(() => clock = sinon.useFakeTimers());
    after(() => clock.restore());

    beforeEach(() => {
        config = {
            isDisabled: false,
            batchSize: 3,
            batchInterval: 10
        };

        channel = new ChannelMock(
            () => config.isDisabled,
            () => config.batchSize,
            () => config.batchInterval,
            <any>sender);
    });

    afterEach(() => {
        sendSpy.reset();
        saveSpy.reset();
    });

    describe("#send(envelope)", () => {
        it("should enqueue telemetry", () => {
            channel.send(testEnvelope);
            clock.tick(config.batchInterval);
            assert.ok(sendSpy.calledOnce);
            assert.equal(sendSpy.firstCall.args[0].toString(), JSON.stringify(testEnvelope));
        });

        it("should do nothing if disabled", () => {
            config.isDisabled = true;
            channel.send(testEnvelope);
            clock.tick(config.batchInterval);
            assert.ok(sendSpy.notCalled);
        });

        it("should log warning if invalid input is passed", () => {
            var warnStub = sinon.stub(console, "warn");
            channel.send(undefined);
            channel.send(null);
            channel.send(<any>"");
            assert.ok(warnStub.calledThrice);
            warnStub.restore();
        });

        it("should not crash JSON.stringify", () => {
            var a = <any>{b: null};
            a.b = a;

            var warnStub = sinon.stub(console, "warn");
            assert.doesNotThrow(() => channel.send(a));
            assert.ok(warnStub.calledOnce);
            warnStub.restore();
        });

        it("should flush the buffer when full", () => {
            for (var i = 0; i < config.batchSize; i++) {
                channel.send(testEnvelope);
            }

            assert.ok(sendSpy.calledOnce);
            assert.ok(channel.getBuffer().length === 0);
        });

        it("should add the payload to the buffer", () => {
            channel.send(testEnvelope);
            assert.ok(channel.getBuffer().length === 1);
            assert.ok(channel.getBuffer()[0] === JSON.stringify(testEnvelope));
        });

        it("should start the timer if not started", () => {
            assert.ok(!channel.getTimeoutHandle());
            channel.send(testEnvelope);
            assert.ok(channel.getTimeoutHandle());
        });

        it("should clear timeout handle after flushing", () => {
            for (var i = 0; i < config.batchSize; i++) {
                channel.send(testEnvelope);
            }

            assert.ok(!channel.getTimeoutHandle(), "cleared after buffer full");

            channel.send(testEnvelope);
            clock.tick(config.batchInterval);
            assert.ok(!channel.getTimeoutHandle(), "cleared after batch interval");
        });
    });

    describe("#handleCrash(envelope)", () => {
        it("should warn if envelope is empty", () => {
            var warnStub = sinon.stub(console, "warn");
            channel.handleCrash(undefined);
            channel.handleCrash(null);
            channel.handleCrash(<any>"");
            assert.ok(warnStub.calledThrice);
            warnStub.restore();
        });

        it("should warn if envelope cannot be serialized", () => {
            var warnStub = sinon.stub(console, "warn");
            var a = <any>{b: null};
            a.b = a;

            channel.handleCrash(a);
            assert.ok(warnStub.calledTwice);
            warnStub.restore();
        });

        it("should trigger send", () => {
            channel.handleCrash(testEnvelope);
            assert.ok(sendSpy.notCalled, "saveOnCrash should be called, not send");
            assert.ok(saveSpy.calledOnce);
            assert.ok(channel.getBuffer().length === 0);
        });
    });

    describe("#triggerSend(isCrash)", () => {
        it("should clear timeout handle", () => {
            channel.send(testEnvelope);
            channel.triggerSend(false);
            assert.ok(sendSpy.calledOnce);
            assert.ok(saveSpy.notCalled);
            assert.ok(channel.getBuffer().length === 0);
            assert.ok(!channel.getTimeoutHandle());
        });

        it("should save to disk if crashing", () => {
            channel.send(testEnvelope);
            channel.triggerSend(true);
            assert.ok(sendSpy.notCalled);
            assert.ok(saveSpy.calledOnce);
            assert.ok(channel.getBuffer().length === 0);
            assert.ok(!channel.getTimeoutHandle());
        });

        it("should format X-JSON by default", () => {
            var first: any = { "first": true };
            var second: any = { "second": true };
            channel.send(first);
            channel.send(second);
            channel.triggerSend(true);
            assert.ok(sendSpy.notCalled);
            assert.ok(saveSpy.calledOnce);
            assert.ok(saveSpy.calledWith(JSON.stringify(first) + "\n" + JSON.stringify(second)))
        });

        it("should not send if empty", () => {
            channel.triggerSend(false);
            assert.ok(sendSpy.notCalled);
            assert.ok(saveSpy.notCalled);
        });

        it("should call callback when empty", () => {
            var callback = sinon.spy();
            channel.triggerSend(false, callback);
            assert.ok(callback.calledOnce);
        });

        it("should call callback when crashing", () => {
            channel.send(testEnvelope);
            var callback = sinon.spy();
            channel.triggerSend(true, callback);
            assert.ok(callback.calledOnce);
        });
    });
});