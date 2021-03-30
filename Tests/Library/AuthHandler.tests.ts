import assert = require("assert");
import sinon = require("sinon");

import azureCore = require("@azure/core-http");
import azureIdentity = require("@azure/identity");

import AuthHandler = require("../../Library/AuthHandler");
import Config = require("../../Library/Config");

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

    describe("#constructor()", () => {
        it("should use Default azure credential when no extra settings in connection string", () => {
            var credStub =  sandbox.stub(azureIdentity, "DefaultAzureCredential");
            var config = new Config("");
            var handler = new AuthHandler(config);
            assert.ok(credStub.calledOnce);
            assert.equal(credStub.firstCall.args.length, 0);
        });

        it("should use ManagedIdentity azure credential when client is provided in connection string", () => {
            var credStub =  sandbox.stub(azureIdentity, "ManagedIdentityCredential");
            var config = new Config("Authorization=aad;appId=testAppId;");
            var handler = new AuthHandler(config);
            assert.ok(credStub.calledOnce);
            assert.equal(credStub.firstCall.args[0], "testAppId");
        });
    });

    describe("#addAuthorizationHeader()", () => {
        it("should add Authorization header to options", async () => {
            var testCache = new TestTokenCache();
            var testRefresher = new TestTokenRefresher();
            testCache.setCachedToken({ token: "testToken" });
            var cacheStub = sandbox.stub(azureCore, "ExpiringAccessTokenCache", () => { return testCache; });
            var refresherStub = sandbox.stub(azureCore, "AccessTokenRefresher", () => { return testRefresher; });
            var config = new Config("");
            var handler = new AuthHandler(config);
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
            var handler = new AuthHandler(config);
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
