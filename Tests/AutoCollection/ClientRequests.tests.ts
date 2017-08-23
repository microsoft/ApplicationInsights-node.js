import assert = require("assert");
import sinon = require("sinon");
import ClientRequests = require("../../AutoCollection/ClientRequests")

import AppInsights = require("../../applicationinsights");

describe("AutoCollection/ClientRequests", () => {
    afterEach(() => {
        AppInsights.dispose();
    });
    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop dependencies autocollection", () => {

            var appInsights = AppInsights.setup("key").setAutoCollectDependencies(true);
            var enableClientRequestsSpy = sinon.spy(ClientRequests.INSTANCE, "enable");
            appInsights.start();

            assert.equal(enableClientRequestsSpy.callCount, 1, "enable should be called once as part of dependencies autocollection initialization");
            assert.equal(enableClientRequestsSpy.getCall(0).args[0], true);
            AppInsights.dispose();
            assert.equal(enableClientRequestsSpy.callCount, 2, "enable(false) should be called once as part of dependencies autocollection shutdown");
            assert.equal(enableClientRequestsSpy.getCall(1).args[0], false);
        });
    });
});