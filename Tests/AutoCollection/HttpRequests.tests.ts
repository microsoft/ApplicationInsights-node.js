import assert = require("assert");
import sinon = require("sinon");
import HttpRequests = require("../../AutoCollection/HttpRequests")
import AppInsights = require("../../applicationinsights");
import { CorrelationContextManager, CorrelationContext } from "../../AutoCollection/CorrelationContextManager";
import Config = require("../../Library/Config");

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
    describe("#useAutoCorrelation", () => {
        it("should not call enable if disabling environment variable is set", () => {
            AppInsights.setup("key").setAutoCollectRequests(true);
            var enableCorrelationStub = sinon.stub(CorrelationContextManager, "enable");

            // Act
            process.env[Config.ENV_disableDependencyCorrelation] = true;
            HttpRequests.INSTANCE.useAutoCorrelation(true);

            // Test
            assert.ok(enableCorrelationStub.notCalled);

            // Cleanup
            HttpRequests.INSTANCE.useAutoCorrelation(false);
            delete process.env[Config.ENV_disableDependencyCorrelation];
            enableCorrelationStub.restore();
        });
        it("should call enable if disabling environment variable is not set", () => {
            AppInsights.setup("key").setAutoCollectRequests(true);
            var enableCorrelationStub = sinon.stub(CorrelationContextManager, "enable");

            // Act
            delete process.env[Config.ENV_disableDependencyCorrelation];
            HttpRequests.INSTANCE.useAutoCorrelation(true);

            // Test
            assert.ok(enableCorrelationStub.calledOnce);

            // Cleanup
            HttpRequests.INSTANCE.useAutoCorrelation(false);
            delete process.env[Config.ENV_disableDependencyCorrelation];
            enableCorrelationStub.restore();
        });
    });
});
