import assert = require("assert");
import sinon = require("sinon");
import nock = require("nock");

import Sender = require("../../Library/Sender");
import Config = require("../../Library/Config");
import AuthorizationHandler = require("../../Library/AuthorizationHandler");

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

    describe("#AuthorizationHandler ", () => {

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

        var sandbox: sinon.SinonSandbox;

        beforeEach(() => {
            sandbox = sinon.sandbox.create();
        });

        afterEach(() => {
            sandbox.restore();
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
