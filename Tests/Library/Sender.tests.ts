import assert = require("assert");
import sinon = require("sinon");
import nock = require("nock");

import Sender = require("../../Library/Sender");
import Config = require("../../Library/Config");
import Constants = require("../../Declarations/Constants");
import AuthorizationHandler = require("../../Library/AuthorizationHandler");


class SenderMock extends Sender {
    public getResendInterval() {
        return this._resendInterval;
    }
}

describe("Library/Sender", () => {

    describe("#setOfflineMode(value, resendInterval)", () => {
        var sender: SenderMock;

        beforeEach(() => {
            sender = new SenderMock(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
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
        let interceptor: nock.Interceptor;

        before(() => {
            interceptor = nock(Constants.DEFAULT_BREEZE_ENDPOINT)
                .post("/v2/track", (body: string) => {
                    return true;
                });
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
