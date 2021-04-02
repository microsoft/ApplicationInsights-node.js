import assert = require("assert");
import sinon = require("sinon");
import nock = require("nock");

import Sender = require("../../Library/Sender");
import Config = require("../../Library/Config");
import Constants = require("../../Declarations/Constants");

class SenderMock extends Sender {
    public getResendInterval() {
        return this._resendInterval;
    }
}

describe("Library/Sender", () => {
    var sender: SenderMock;

    beforeEach(() => {
        sender = new SenderMock(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
    });

    describe("#setOfflineMode(value, resendInterval)", () => {
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

        it("should change ingestion endpoint when redirect response code is returned (301)", (done) => {
            interceptor.reply(301, {}, { "Location": "testLocation" });
            var testSender = new Sender(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
            testSender.send(new Buffer("test"), (responseText) => {
                assert.equal(testSender["_redirectedHost"], "testLocation");
                done();
            });
        });

        it("should change ingestion endpoint when redirect response code is returned (308)", (done) => {
            interceptor.reply(308, {}, { "Location": "testLocation" });
            var testSender = new Sender(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
            testSender.send(new Buffer("test"), (responseText) => {
                assert.equal(testSender["_redirectedHost"], "testLocation");
                done();
            });
        });

        it("should not change ingestion endpoint if redirect is not triggered", (done) => {
            interceptor.reply(200, {}, { "Location": "testLocation" });
            var testSender = new Sender(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
            testSender.send(new Buffer("test"), (responseText) => {
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
            var testSender = new Sender(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
            testSender.send(new Buffer("test"), () => {
                assert.equal(testSender["_redirectedHost"], redirectLocation);
                testSender.send(new Buffer("test"), (responseText) => {
                    assert.equal(responseText, '{"redirectProperty":true}');
                    done();
                });
            });
        });

    });
});
