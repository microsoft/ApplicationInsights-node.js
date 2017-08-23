import assert = require("assert");
import sinon = require("sinon");
import Console = require("../../AutoCollection/Console")

import AppInsights = require("../../applicationinsights");

describe("AutoCollection/Console", () => {
    afterEach(() => {
        AppInsights.dispose();
    });
    describe("#init and #dispose()", () => {
        it("init should enable and dispose should stop console autocollection", () => {

            var appInsights = AppInsights.setup("key").setAutoCollectConsole(true);
            var enableConsoleRequestsSpy = sinon.spy(Console.INSTANCE, "enable");
            appInsights.start();

            assert.equal(enableConsoleRequestsSpy.callCount, 1, "enable should be called once as part of console autocollection initialization");
            assert.equal(enableConsoleRequestsSpy.getCall(0).args[0], true);
            AppInsights.dispose();
            assert.equal(enableConsoleRequestsSpy.callCount, 2, "enable(false) should be called once as part of console autocollection shutdown");
            assert.equal(enableConsoleRequestsSpy.getCall(1).args[0], false);
        });
    });
});