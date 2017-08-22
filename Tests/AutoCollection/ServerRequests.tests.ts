import assert = require("assert");
import sinon = require("sinon");
import ServerRequests = require("../../AutoCollection/ServerRequests")
import AppInsights = require("../../applicationinsights");

describe("AutoCollection/ServerRequests", () => {
    afterEach(() => {
        AppInsights.dispose();
    });
    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop server requests autocollection", () => {
        var appInsights = AppInsights.setup("key").setAutoCollectDependencies(true);
            var enableServerRequestsSpy = sinon.spy(ServerRequests.INSTANCE, "enable");
            appInsights.start();

            assert.equal(enableServerRequestsSpy.callCount, 1, "enable should be called once as part of requests autocollection initialization");
            assert.equal(enableServerRequestsSpy.getCall(0).args[0], true);
            AppInsights.dispose();
            assert.equal(enableServerRequestsSpy.callCount, 2, "enable(false) should be called once as part of requests autocollection shutdown");
            assert.equal(enableServerRequestsSpy.getCall(1).args[0], false);
        });
    });
});