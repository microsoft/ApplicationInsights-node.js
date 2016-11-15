///<reference path="..\..\typings\globals\node\index.d.ts" />
///<reference path="..\..\typings\globals\mocha\index.d.ts" />

import assert = require("assert");

import Sender = require("../../Library/Sender");

class SenderMock extends Sender {
    public getResendInterval() {
        return this._resendInterval;
    }
}

describe("Library/Sender", () => {
    var sender:SenderMock;

    beforeEach(() => {
        sender = new SenderMock(() => "https://www.microsoft.com");
    });

    describe("#setOfflineMode(value, resendInterval)", () => {
        it("default resend interval is 60 seconds", () => {
            sender.setOfflineMode(true);
            assert.equal(Sender.WAIT_BETWEEN_RESEND, sender.getResendInterval());
        });

        it("resend interval can be configured", () => {
            sender.setOfflineMode(true, 0);
            assert.equal(0, sender.getResendInterval());

            sender.setOfflineMode(true, 1234);
            assert.equal(1234, sender.getResendInterval());

            sender.setOfflineMode(true, 1234.56);
            assert.equal(1234, sender.getResendInterval());
        });

        it("resend interval can't be negative", () => {
            sender.setOfflineMode(true, -1234);
            assert.equal(Sender.WAIT_BETWEEN_RESEND, sender.getResendInterval());
        });
    });
});
