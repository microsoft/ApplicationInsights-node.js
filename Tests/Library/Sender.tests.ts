import assert = require("assert");
import fs = require("fs");
import https = require("https");
import sinon = require("sinon");
import nock = require("nock");

import Sender = require("../../Library/Sender");
import Config = require("../../Library/Config");
import Constants = require("../../Declarations/Constants");
import Contracts = require("../../Declarations/Contracts");
import Util = require("../../Library/Util");

class SenderMock extends Sender {
    public getResendInterval() {
        return this._resendInterval;
    }
}

describe("Library/Sender", () => {

    Util.tlsRestrictedAgent = new https.Agent();
    var testEnvelope = new Contracts.Envelope();
    var sandbox: sinon.SinonSandbox;
    let interceptor: nock.Interceptor;
    let nockScope: nock.Scope;

    before(() => {
        interceptor = nock(Constants.DEFAULT_BREEZE_ENDPOINT)
            .post("/v2.1/track", (body: string) => {
                return true;
            });
    });

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
        if (nockScope && nockScope.restore) {
            nockScope.restore();
        }
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
            nockScope = interceptor.reply(200, breezeResponse);
            nockScope.persist();
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
            nockScope = interceptor.reply(408, null);
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
            nockScope = interceptor.reply(206, breezeResponse);
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

        after(() => {
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
            nockScope = interceptor.reply(308, {}, { "Location": "testLocation" });
            var testSender = new Sender(new Config("2bb22222-bbbb-1ccc-8ddd-eeeeffff3333"));
            var sendSpy = sandbox.spy(testSender, "send");
            testSender.send([testEnvelope], (responseText) => {
                assert.equal(testSender["_redirectedHost"], "testLocation");
                assert.ok(sendSpy.callCount === 2); // Original and redirect calls
                done();
            });
        });

        it("should change ingestion endpoint when temporary redirect response code is returned (307)", (done) => {
            nockScope = interceptor.reply(307, {}, { "Location": "testLocation" });
            var testSender = new Sender(new Config("2bb22222-bbbb-1ccc-8ddd-eeeeffff3333"));
            var sendSpy = sandbox.spy(testSender, "send");
            testSender.send([testEnvelope], (responseText) => {
                assert.equal(testSender["_redirectedHost"], "testLocation");
                assert.ok(sendSpy.callCount === 2); // Original and redirect calls
                done();
            });
        });

        it("should not change ingestion endpoint if redirect is not triggered", (done) => {
            nockScope = interceptor.reply(200, {}, { "Location": "testLocation" });
            var testSender = new Sender(new Config("2bb22222-bbbb-1ccc-8ddd-eeeeffff3333"));
            testSender.send([testEnvelope], (responseText) => {
                assert.equal(testSender["_redirectedHost"], null);
                done();
            });
        });

        // it("should use redirect URL for following requests", (done) => {
        //     let redirectHost = "https://testlocation";
        //     let redirectLocation = redirectHost + "/v2.1/track";
        //     // Fake redirect endpoint
        //     let redirectInterceptor = nock(redirectHost)
        //         .post("/v2.1/track", (body: string) => {
        //             return true;
        //         });

        //     redirectInterceptor.reply(200, { "redirectProperty": true }).persist();

        //     nockScope = interceptor.reply(308, {}, { "Location": redirectLocation });
        //     var testSender = new Sender(new Config("2bb22222-bbbb-1ccc-8ddd-eeeeffff3333"));
        //     var sendSpy = sandbox.spy(testSender, "send");
        //     testSender.send([testEnvelope], (resposneText) => {
        //         assert.equal(testSender["_redirectedHost"], redirectLocation);
        //         assert.equal(resposneText, '{"redirectProperty":true}');
        //         assert.ok(sendSpy.calledTwice);
        //         testSender.send([testEnvelope], (secondResponseText) => {
        //             assert.equal(secondResponseText, '{"redirectProperty":true}');
        //             assert.ok(sendSpy.calledThrice);
        //             done();
        //         });
        //     });
        // });

        // it("should stop redirecting when circular redirect is triggered", (done) => {
        //     let redirectHost = "https://circularredirect";
        //     // Fake redirect endpoint
        //     let redirectInterceptor = nock(redirectHost)
        //         .post("/v2.1/track", (body: string) => {
        //             return true;
        //         });
        //     redirectInterceptor.reply(307, {}, { "Location": Constants.DEFAULT_BREEZE_ENDPOINT + "/v2.1/track" }).persist();

        //     nockScope = interceptor.reply(307, {}, { "Location": redirectHost + "/v2.1/track" });
        //     var testSender = new Sender(new Config("2bb22222-bbbb-1ccc-8ddd-eeeeffff3333"));
        //     var sendSpy = sandbox.spy(testSender, "send");
        //     testSender.send([testEnvelope], (responseText) => {
        //         assert.equal(responseText, "Error sending telemetry because of circular redirects.");
        //         assert.equal(sendSpy.callCount, 10);
        //         done();
        //     });
        // });

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
});
