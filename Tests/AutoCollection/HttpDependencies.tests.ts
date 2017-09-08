import assert = require("assert");
import sinon = require("sinon");
import HttpDependencies = require("../../AutoCollection/HttpDependencies")

import AppInsights = require("../../applicationinsights");

describe("AutoCollection/HttpDependencies", () => {
    afterEach(() => {
        AppInsights.dispose();
    });
    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop dependencies autocollection", () => {

            var appInsights = AppInsights.setup("key").setAutoCollectDependencies(true);
            var enableHttpDependenciesSpy = sinon.spy(HttpDependencies.INSTANCE, "enable");
            appInsights.start();

            assert.equal(enableHttpDependenciesSpy.callCount, 1, "enable should be called once as part of dependencies autocollection initialization");
            assert.equal(enableHttpDependenciesSpy.getCall(0).args[0], true);
            AppInsights.dispose();
            assert.equal(enableHttpDependenciesSpy.callCount, 2, "enable(false) should be called once as part of dependencies autocollection shutdown");
            assert.equal(enableHttpDependenciesSpy.getCall(1).args[0], false);
        });
    });
});