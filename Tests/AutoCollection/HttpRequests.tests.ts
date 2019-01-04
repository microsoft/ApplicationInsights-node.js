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
        var appInsights = AppInsights.setup("key").setAutoCollectRequests(true);
            var enableHttpRequestsSpy = sinon.spy(HttpRequests.INSTANCE, "enable");
            appInsights.start();

            assert.equal(enableHttpRequestsSpy.callCount, 1, "enable should be called once as part of requests autocollection initialization");
            assert.equal(enableHttpRequestsSpy.getCall(0).args[0], true);
            AppInsights.dispose();
            assert.equal(enableHttpRequestsSpy.callCount, 2, "enable(false) should be called once as part of requests autocollection shutdown");
            assert.equal(enableHttpRequestsSpy.getCall(1).args[0], false);
        });
    });

    describe("#startOperation()", () => {
        it("should call runWithContext with correct context", () => {
            AppInsights.setup("key").setAutoCollectRequests(true).start();
            var client = AppInsights.defaultClient;
            var request = {
                method: "GET",
                url: "/search?q=test",
                connection: {
                    encrypted: false
                },
                headers: {
                    host: "bing.com"
                }
            }

            CorrelationContextManager.enable();
            var fn = sinon.spy();
            var operationSpy = sinon.spy(CorrelationContextManager, "runWithContext");

            assert(fn.notCalled);
            assert(operationSpy.notCalled);

            CorrelationContextManager.startOperation(client, <any>request, fn);

            assert(fn.calledOnce);
            assert(operationSpy.calledOnce);

            var context: CorrelationContext = operationSpy.args[0][0];
            assert(context.operation.id.length > 0)
            assert(context.operation.parentId.length > 0)
            assert(context.operation.name === `${request.method} ${request.url.substring(0, request.url.indexOf('?'))}`);
        });
    });
});
