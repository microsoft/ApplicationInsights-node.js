import assert = require("assert");
import sinon = require("sinon");
import azureCore = require("@azure/core-http");

import AuthorizationHandler = require("../../Library/AuthorizationHandler");
import Config = require("../../Library/Config");

class TestTokenCredential implements azureCore.TokenCredential {
    async getToken(scopes: string | string[], options?: any): Promise<any> {
        return {
            token: "testToken",
            expiresOnTimestamp: new Date()
        };
    }
}

class TestTokenCache {
    private testToken: any = "";

    getCachedToken() {
        return this.testToken;
    }

    setCachedToken(token: any) {
        this.testToken = token;
    }
}

class TestTokenRefresher {
    isReady() {
        return true;
    }

    refresh(options: any) {
        return {
            token: "testRefreshedToken"
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
            var testCache = new TestTokenCache();
            var testRefresher = new TestTokenRefresher();
            testCache.setCachedToken({ token: "testToken" });
            var cacheStub = sandbox.stub(azureCore, "ExpiringAccessTokenCache", () => { return testCache; });
            var refresherStub = sandbox.stub(azureCore, "AccessTokenRefresher", () => { return testRefresher; });
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
            assert.ok(cacheStub.calledOnce);
            assert.ok(refresherStub.calledOnce);
            assert.equal(options.headers["authorization"], "Bearer testToken");
        });

        it("should refresh token if not cached", async () => {
            var testCache = new TestTokenCache();
            var testRefresher = new TestTokenRefresher();
            var cacheStub = sandbox.stub(azureCore, "ExpiringAccessTokenCache", () => { return testCache; });
            var refresherStub = sandbox.stub(azureCore, "AccessTokenRefresher", () => { return testRefresher; });
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
            assert.ok(cacheStub.calledOnce);
            assert.ok(refresherStub.calledOnce);
            assert.equal(options.headers["authorization"], "Bearer testRefreshedToken");
        });
    });
});
