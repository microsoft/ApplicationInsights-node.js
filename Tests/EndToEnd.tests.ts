///<reference path="..\Declarations\node\node.d.ts" />
///<reference path="..\Declarations\mocha\mocha.d.ts" />
///<reference path="..\Declarations\sinon\sinon.d.ts" />

import assert = require("assert");
import sinon = require("sinon");
import AppInsights = require("../applicationInsights");

describe("EndToEnd", () => {

    var warnStub;
    before(() => warnStub = sinon.stub(console, "warn"));
    after(() => warnStub.restore());

    describe("Basic usage", () => {
        it("should send telemetry", () => {
            AppInsights
                .setup("ikey")
                .start();

            var client =AppInsights.client;
            client.trackEvent("test event");
            client.trackException(new Error("test error"));
            client.trackMetric("test metric", 3);
            client.trackTrace("test trace");
            client.sendPendingData();
        });
    });
});