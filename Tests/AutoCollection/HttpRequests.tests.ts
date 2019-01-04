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
});
