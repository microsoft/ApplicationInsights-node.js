import * as assert from "assert";
import * as https from "https";
import * as sinon from "sinon";
import * as azureCore from "@azure/core-http";

import { AuthorizationHandler } from "../../../src/library/QuickPulse/AuthorizationHandler";
import { Config } from "../../../src/library/configuration";
import { Util } from "../../../src/library/util";

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
            expiresOnTimestamp: this._expiresOn,
        };
    }
}

describe("Library/AuthorizationHandler", () => {
    var sandbox: sinon.SinonSandbox;
    Util.getInstance().tlsRestrictedAgent = new https.Agent();

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("#addAuthorizationHeader()", () => {
        it("should add Authorization header to options", async () => {
            var config = new Config("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            config.aadTokenCredential = new TestTokenCredential();
            var handler = new AuthorizationHandler(config.aadTokenCredential);
            var options = {
                method: "POST",
                headers: <{ [key: string]: string }>{
                    "Content-Type": "application/x-json-stream",
                },
            };
            await handler.addAuthorizationHeader(options);
            assert.equal(options.headers["authorization"], "Bearer testToken1");
        });

        it("should refresh token if expired", async () => {
            var config = new Config("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/");
            var tokenCredential = new TestTokenCredential(
                new Date(new Date().getMilliseconds() - 500)
            );
            config.aadTokenCredential = tokenCredential;
            var handler = new AuthorizationHandler(config.aadTokenCredential);
            var options: https.RequestOptions = {
                method: "POST",
                headers: <{ [key: string]: string }>{
                    "Content-Type": "application/x-json-stream",
                },
                protocol: "HTTPS",
            };
            await handler.addAuthorizationHeader(options);
            assert.equal(options.headers["authorization"], "Bearer testToken1");
            await handler.addAuthorizationHeader(options);
            assert.equal(tokenCredential["_numberOfRefreshs"], 2);
            assert.equal(options.headers["authorization"], "Bearer testToken2");
        });
    });
});
