import assert = require("assert");
import sinon = require("sinon");
import azureCore = require("@azure/core-http");

import AuthorizationHandler = require("../../Library/AuthorizationHandler");
import Config = require("../../Library/Config");

class TestTokenCredential implements azureCore.TokenCredential {
    private _expiresOn: Date;
    private _numberOfRefreshs = 0;

    constructor(expiresOn?: Date) {
        this._expiresOn = expiresOn || new Date();
    }

    async getToken(scopes: string | string[], options?: any): Promise<any> {
        this._numberOfRefreshs++;
        return {
            token: "testToken" + this._numberOfRefreshs,
            expiresOnTimestamp: this._expiresOn
        };
    }
}

describe("Library/AuthorizationHandler", () => {

    var sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#addAuthorizationHeader()", () => {
        it("should add Authorization header to options", async () => {
            var config = new Config("");
            config.aadTokenCredential = new TestTokenCredential();
            var handler = new AuthorizationHandler(config.aadTokenCredential);
            var options = {
                method: "POST",
                headers: <{ [key: string]: string }>{
                    "Content-Type": "application/x-json-stream"
                }
            };
            await handler.addAuthorizationHeader(options);
            assert.equal(options.headers["authorization"], "Bearer testToken1");
        });

        it("should refresh token if expired", async () => {
            var config = new Config("");
            var tokenCredential = new TestTokenCredential(new Date(new Date().getMilliseconds() - 500));
            config.aadTokenCredential = tokenCredential;
            var handler = new AuthorizationHandler(config.aadTokenCredential);
            var options = {
                method: "POST",
                headers: <{ [key: string]: string }>{
                    "Content-Type": "application/x-json-stream"
                }
            };
            await handler.addAuthorizationHeader(options);
            assert.equal(options.headers["authorization"], "Bearer testToken1");
            await handler.addAuthorizationHeader(options);
            assert.equal(tokenCredential["_numberOfRefreshs"], 2);
            assert.equal(options.headers["authorization"], "Bearer testToken2");
        });
    });
});
