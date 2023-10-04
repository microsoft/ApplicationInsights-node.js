import assert = require("assert");
import https = require("https");
import sinon = require("sinon");
import azureCoreAuth = require("@azure/core-auth");

import AuthorizationHandler = require("../../Library/AuthorizationHandler");
import Config = require("../../Library/Config");
import Util = require("../../Library/Util");

class TestTokenCredential implements azureCoreAuth.TokenCredential {
    private _expiresOn: Date;
    private _numberOfRefreshs = 0;

    public scopes: string | string[];

    constructor(expiresOn?: Date) {
        this._expiresOn = expiresOn || new Date();
    }

    async getToken(scopes: string | string[], options?: any): Promise<any> {
        this.scopes = scopes;
        this._numberOfRefreshs++;
        return {
            token: "testToken" + this._numberOfRefreshs,
            expiresOnTimestamp: this._expiresOn
        };
    }
}

describe("Library/AuthorizationHandler", () => {

    var sandbox: sinon.SinonSandbox;
    Util.tlsRestrictedAgent = new https.Agent();

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#addAuthorizationHeader()", () => {
        it("should add Authorization header to options", async () => {
            var config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            const testCredential = new TestTokenCredential();
            config.aadTokenCredential = testCredential;
            var handler = new AuthorizationHandler(config.aadTokenCredential);
            var options = {
                method: "POST",
                headers: <{ [key: string]: string }>{
                    "Content-Type": "application/x-json-stream"
                }
            };
            await handler.addAuthorizationHeader(options);
            assert.equal(options.headers["authorization"], "Bearer testToken1");
            // Default scope
            assert.deepEqual(testCredential.scopes, ["https://monitor.azure.com//.default"]);
        });

        it("should refresh token if expired", async () => {
            var config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            var tokenCredential = new TestTokenCredential(new Date(new Date().getMilliseconds() - 500));
            config.aadTokenCredential = tokenCredential;
            var handler = new AuthorizationHandler(config.aadTokenCredential);
            var options: https.RequestOptions = {
                method: "POST",
                headers: <{ [key: string]: string }>{
                    "Content-Type": "application/x-json-stream"
                },
                protocol: "HTTPS"
            };
            await handler.addAuthorizationHeader(options);
            assert.equal(options.headers["authorization"], "Bearer testToken1");
            await handler.addAuthorizationHeader(options);
            assert.equal(tokenCredential["_numberOfRefreshs"], 2);
            assert.equal(options.headers["authorization"], "Bearer testToken2");
        });

        it("should allow configuration of credentialScopes", async () => {
            var config = new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            const testCredential = new TestTokenCredential();
            config.aadTokenCredential = testCredential;
            config.aadAudience = "testAudience";
            var handler = new AuthorizationHandler(config.aadTokenCredential, config.aadAudience);
            var options = {
                method: "POST",
                headers: <{ [key: string]: string }>{
                    "Content-Type": "application/x-json-stream"
                }
            };
            await handler.addAuthorizationHeader(options);
            assert.deepEqual(testCredential.scopes, ["testAudience"]);
        });
    });
});
