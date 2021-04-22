import assert = require("assert");
import fs = require("fs");
import sinon = require("sinon");
import nock = require("nock");

import Sender = require("../../Library/Sender");
import Config = require("../../Library/Config");
import Constants = require("../../Declarations/Constants");
import Contracts = require("../../Declarations/Contracts");
import AuthorizationHandler = require("../../Library/AuthorizationHandler");

class SenderMock extends Sender {
    public getResendInterval() {
        return this._resendInterval;
    }
}

describe("Library/Sender", () => {

    var testEnvelope = new Contracts.Envelope();
    var sandbox: sinon.SinonSandbox;
    let interceptor: nock.Interceptor;

    before(() => {
        interceptor = nock(Constants.DEFAULT_BREEZE_ENDPOINT)
            .post("/v2/track", (body: string) => {
                return true;
            });
    });

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    after(() => {
        nock.cleanAll();
    });


    describe("#send(envelope)", () => {
        var sender: Sender;

        before(() => {
            sender = new Sender(new Config("2bb22222-bbbb-1ccc-8ddd-eeeeffff3333"));
            (<any>sender.constructor).USE_ICACLS = false;
            sender.setDiskRetryMode(true);
        });

        after(() => {
            (<any>sender.constructor).USE_ICACLS = true;
            sender.setDiskRetryMode(false);
        });

        it("should not crash JSON.stringify", () => {
            var a = <any>{ b: null };
            a.b = a;
            var warnStub = sandbox.stub(console, "warn");
            assert.doesNotThrow(() => sender.send([a]));
            assert.ok(warnStub.calledOnce);
        });

        it("should try to send telemetry from disk when 200", (done) => {
            var breezeResponse: Contracts.BreezeResponse = {
                itemsAccepted: 1,
                itemsReceived: 1,
                errors: []
            };
            let diskEnvelope = new Contracts.Envelope();
            diskEnvelope.name = "DiskEnvelope";
            sender["_storeToDisk"]([diskEnvelope]);
            var sendSpy = sandbox.spy(sender, "send");
            interceptor.reply(200, breezeResponse).persist();
            sender["_resendInterval"] = 100;
            sender.send([testEnvelope], (responseText) => {
                // Wait for resend timer
                setTimeout(() => {
                    assert.ok(sendSpy.calledTwice);
                    assert.equal(sendSpy.secondCall.args[0][0].name, "DiskEnvelope");
                    done();
                }, 200)

            });
        });

        it("should put telemetry in disk when retryable code is returned", (done) => {
            var envelope = new Contracts.Envelope();
            envelope.name = "TestRetryable";
            interceptor.reply(408, null);
            var storeStub = sandbox.stub(sender, "_storeToDisk");
            sender.send([envelope], (responseText) => {
                assert.ok(storeStub.calledOnce);
                assert.equal(storeStub.firstCall.args[0][0].name, "TestRetryable");
                done();
            });
        });

        it("should retry only failed events in partial content response", (done) => {
            var breezeResponse: Contracts.BreezeResponse = {
                itemsAccepted: 2,
                itemsReceived: 4,
                errors: [{
                    index: 0,
                    statusCode: 408,
                    message: ""
                }, {
                    index: 2,
                    statusCode: 123,
                    message: ""
                }]
            };
            var envelopes = [];
            for (var i = 0; i < 4; i++) {
                var newEnvelope = new Contracts.Envelope();
                newEnvelope.name = "TestPartial" + i;
                envelopes.push(newEnvelope);
            }
            interceptor.reply(206, breezeResponse);
            var storeStub = sandbox.stub(sender, "_storeToDisk");
            sender.send(envelopes, () => {
                assert.ok(storeStub.calledOnce);
                assert.equal(storeStub.firstCall.args[0].length, 1);
                assert.equal(storeStub.firstCall.args[0][0].name, "TestPartial0");
                done();
            });
        });
    });

    describe("#setOfflineMode(value, resendInterval)", () => {
        var sender: SenderMock;
        beforeEach(() => {
            sender = new SenderMock(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
        });

        after(()=>{
            sender.setDiskRetryMode(false);
        });

        it("default resend interval is 60 seconds", () => {
            sender.setDiskRetryMode(true);
            assert.equal(Sender.WAIT_BETWEEN_RESEND, sender.getResendInterval());
        });

        it("resend interval can be configured", () => {
            sender.setDiskRetryMode(true, 0);
            assert.equal(0, sender.getResendInterval());

            sender.setDiskRetryMode(true, 1234);
            assert.equal(1234, sender.getResendInterval());

            sender.setDiskRetryMode(true, 1234.56);
            assert.equal(1234, sender.getResendInterval());
        });

        it("resend interval can't be negative", () => {
            sender.setDiskRetryMode(true, -1234);
            assert.equal(Sender.WAIT_BETWEEN_RESEND, sender.getResendInterval());
        });
    });

    describe("#endpoint redirect", () => {
        it("should change ingestion endpoint when redirect response code is returned (308)", (done) => {
            interceptor.reply(308, {}, { "Location": "testLocation" });
            var testSender = new Sender(new Config("2bb22222-bbbb-1ccc-8ddd-eeeeffff3333"));
            testSender.send([testEnvelope], (responseText) => {
                assert.equal(testSender["_redirectedHost"], "testLocation");
                done();
            });
        });

        it("should not change ingestion endpoint if redirect is not triggered", (done) => {
            interceptor.reply(200, {}, { "Location": "testLocation" });
            var testSender = new Sender(new Config("2bb22222-bbbb-1ccc-8ddd-eeeeffff3333"));
            testSender.send([testEnvelope], (responseText) => {
                assert.equal(testSender["_redirectedHost"], null);
                done();
            });
        });

        it("should use redirect URL for following requests", (done) => {
            let redirectHost = "https://testLocation";
            let redirectLocation = redirectHost + "/v2/track";
            // Fake redirect endpoint
            nock(redirectHost)
                .post("/v2/track", (body: string) => {
                    return true;
                }).reply(200, { "redirectProperty": true });
            interceptor.reply(308, {}, { "Location": redirectLocation });
            var testSender = new Sender(new Config("2bb22222-bbbb-1ccc-8ddd-eeeeffff3333"));
            testSender.send([testEnvelope], () => {
                assert.equal(testSender["_redirectedHost"], redirectLocation);
                testSender.send([testEnvelope], (responseText) => {
                    assert.equal(responseText, '{"redirectProperty":true}');
                    done();
                });
            });
        });

    });

    describe("#fileCleanupTask", () => {
        var sender: Sender;

        after(() => {
            (<any>sender.constructor).USE_ICACLS = true;
            sender.setDiskRetryMode(false);
        });

        it("must clean old files from temp location", (done) => {
            var deleteSpy = sandbox.spy(fs, "unlink");
            sender = new Sender(new Config("3bb33333-bbbb-1ccc-8ddd-eeeeffff3333"));
            (<any>sender.constructor).USE_ICACLS = false;
            (<any>sender.constructor).CLEANUP_TIMEOUT = 500;
            (<any>sender.constructor).FILE_RETEMPTION_PERIOD = 1;
            var taskSpy = sandbox.spy(sender, "_fileCleanupTask");
            sender.setDiskRetryMode(true);
            let diskEnvelope = new Contracts.Envelope();
            diskEnvelope.name = "DiskEnvelope";
            sender["_storeToDisk"]([diskEnvelope]);
            setTimeout(() => {
                assert.ok(taskSpy.calledOnce);
                assert.ok(deleteSpy.called);
                done();
            }, 600);
        });
    });
  
  describe("#AuthorizationHandler ", () => {
        before(() => {
            nock("https://dc.services.visualstudio.com")
                .post("/v2/track", (body: string) => {
                    return true;
                })
                .reply(200, {
                    itemsAccepted: 1,
                    itemsReceived: 1,
                    errors: []
                })
                .persist();
        });

        var sandbox: sinon.SinonSandbox;

        beforeEach(() => {
            sandbox = sinon.sandbox.create();
        });

        afterEach(() => {
            sandbox.restore();
        });

        after(() => {
            nock.cleanAll();
        });

        it("should add token if handler present", () => {
            var handler = new AuthorizationHandler({
                async getToken(scopes: string | string[], options?: any): Promise<any> {
                    return { token: "testToken", };
                }
            });
            var getAuthorizationHandler = () => {
                return handler;
            };
            var config = new Config("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            var addHeaderStub = sandbox.stub(handler, "addAuthorizationHeader");

            var sender = new Sender(config, getAuthorizationHandler);
            sender.send(new Buffer("test"));
            assert.ok(addHeaderStub.calledOnce);
        });

        it("should put telemetry to disk if auth fails", () => {
            var handler = new AuthorizationHandler({
                async getToken(scopes: string | string[], options?: any): Promise<any> {
                    return { token: "testToken", };
                }
            });
            var getAuthorizationHandler = () => {
                return handler;
            };
            var config = new Config("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;");
            var addHeaderStub = sandbox.stub(handler, "addAuthorizationHeader", () => { throw new Error(); });

            var sender = new Sender(config, getAuthorizationHandler);
            var storeToDiskStub = sandbox.stub(sender, "_storeToDisk");
            var buffer = new Buffer("test");
            sender.send(buffer);
            assert.ok(addHeaderStub.calledOnce);
            assert.ok(storeToDiskStub.calledOnce);
            assert.equal(storeToDiskStub.firstCall.args[0], buffer);
        });
    });
});
