import assert = require("assert");
import sinon = require("sinon");
import HttpRequests = require("../../AutoCollection/HttpRequests")
import AppInsights = require("../../applicationinsights");
import { CorrelationContextManager, CorrelationContext } from "../../AutoCollection/CorrelationContextManager";

describe("AutoCollection/HttpRequests", () => {
    afterEach(() => {
        AppInsights.dispose();
    });
    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop server requests autocollection", () => {
        var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").setAutoCollectRequests(true);
            var enableHttpRequestsSpy = sinon.spy(HttpRequests.INSTANCE, "enable");
            appInsights.start();

            assert.equal(enableHttpRequestsSpy.callCount, 1, "enable should be called once as part of requests autocollection initialization");
            assert.equal(enableHttpRequestsSpy.getCall(0).args[0], true);
            AppInsights.dispose();
            assert.equal(enableHttpRequestsSpy.callCount, 2, "enable(false) should be called once as part of requests autocollection shutdown");
            assert.equal(enableHttpRequestsSpy.getCall(1).args[0], false);
        });
    });

    describe("#addResponseCorrelationIdHeader", () => {
        var response = {
            headers: <{[key: string]: any} >{},
            getHeader: function (name: string) { return this.headers[name] },
            setHeader: function (name: string, value: any) { this.headers[name] = value },
            clearHeaders: function() { this.headers = {} }
        }

        afterEach(() => {
            AppInsights.dispose();
            response.clearHeaders();
        });

        it("should accept string request-context", () => {
            var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").setAutoCollectRequests(true);
            AppInsights.defaultClient.config.correlationId = "abcdefg";
            appInsights.start();

            response.setHeader("request-context", "appId=cid-v1:aaaaed48-297a-4ea2-af46-0a5a5d26aaaa");
            assert.doesNotThrow(() => HttpRequests["addResponseCorrelationIdHeader"](AppInsights.defaultClient, response as any))
        });

        it("should accept nonstring request-context", () => {
            var appInsights = AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").setAutoCollectDependencies(true);
            AppInsights.defaultClient.config.correlationId = "abcdefg";
            appInsights.start();

            response.setHeader("request-context", ["appId=cid-v1:aaaaed48-297a-4ea2-af46-0a5a5d26aaaa"]);
            assert.doesNotThrow(() => HttpRequests["addResponseCorrelationIdHeader"](AppInsights.defaultClient, response as any));
            assert.deepEqual(response.getHeader("request-context"), ["appId=cid-v1:aaaaed48-297a-4ea2-af46-0a5a5d26aaaa"], "does not modify valid appId")

            response.setHeader("request-context", 123);
            assert.doesNotThrow(() => HttpRequests["addResponseCorrelationIdHeader"](AppInsights.defaultClient, response as any));
            assert.ok(response.getHeader("request-context").indexOf("abcdefg") !== -1)

            response.setHeader("request-context", {foo: 'bar'});
            assert.doesNotThrow(() => HttpRequests["addResponseCorrelationIdHeader"](AppInsights.defaultClient, response as any));
            assert.ok(response.getHeader("request-context").indexOf("abcdefg") !== -1)
        })
    });
});
