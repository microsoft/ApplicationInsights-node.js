///<reference path="..\Declarations\node\node.d.ts" />
///<reference path="..\Declarations\mocha\mocha.d.ts" />
///<reference path="..\Declarations\sinon\sinon.d.ts" />

import assert = require("assert");
import sinon = require("sinon");

describe("ApplicationInsights", () => {

    var warnStub;
    before(() => warnStub = sinon.stub(console, "warn"));
    after(() => warnStub.restore());

    describe("#setup()", () => {
        var AppInsights = require("../applicationInsights");
        var Console = require("../AutoCollection/Console");
        var Exceptions = require("../AutoCollection/Exceptions");
        var Performance = require("../AutoCollection/Performance");
        var Requests = require("../AutoCollection/Requests");
        beforeEach(() => {
            warnStub.reset();
            Console.INSTANCE = undefined;
            Exceptions.INSTANCE = undefined;
            Performance.INSTANCE = undefined;
            Requests.INSTANCE = undefined;
        });

        afterEach(() => AppInsights.client = undefined);
        after(() => warnStub.restore());

        it("should not warn if setup is called once", () => {
            AppInsights.setup("key");
            assert.ok(warnStub.notCalled, "warning was not raised");
        });

        it("should warn if setup is called twice", () => {
            AppInsights.setup("key");
            AppInsights.setup("key");
            assert.ok(warnStub.calledOn, "warning was raised");
        });

        it("should not overwrite default client if called more than once", () => {
            AppInsights.setup("key");
            var client = AppInsights.client;
            AppInsights.setup("key");
            AppInsights.setup("key");
            AppInsights.setup("key");
            assert.ok(client === AppInsights.client, "client is not overwritten");
        });
    });

    describe("#start()", () => {
        var AppInsights = require("../applicationInsights");
        var Console = require("../AutoCollection/Console");
        var Exceptions = require("../AutoCollection/Exceptions");
        var Performance = require("../AutoCollection/Performance");
        var Requests = require("../AutoCollection/Requests");

        beforeEach(() => {
            warnStub.reset();
            Console.INSTANCE = undefined;
            Exceptions.INSTANCE = undefined;
            Performance.INSTANCE = undefined;
            Requests.INSTANCE = undefined;
        });

        afterEach(() => AppInsights.client = undefined);

        it("should warn if start is called before setup", () => {
            AppInsights.start();
            assert.ok(warnStub.calledOn, "warning was raised");
        });

        it("should not warn if start is called after setup", () => {
            AppInsights.setup("key").start();
            assert.ok(warnStub.notCalled, "warning was not raised");
        });
    });

    describe("#setAutoCollect", () => {
        var AppInsights = require("../applicationInsights");
        var Console = require("../AutoCollection/Console");
        var Exceptions = require("../AutoCollection/Exceptions");
        var Performance = require("../AutoCollection/Performance");
        var Requests = require("../AutoCollection/Requests");

        beforeEach(() => {
            AppInsights.client = undefined;
            Console.INSTANCE = undefined;
            Exceptions.INSTANCE = undefined;
            Performance.INSTANCE = undefined;
            Requests.INSTANCE = undefined;
        });

        it("auto-collection is initialized by default", () => {
            AppInsights.setup("key").start();

            //assert.ok(Console.INSTANCE.isInitialized());
            assert.ok(Exceptions.INSTANCE.isInitialized());
            assert.ok(Performance.INSTANCE.isInitialized());
            assert.ok(Requests.INSTANCE.isInitialized());
        });

        it("auto-collection is not initialized if disabled before 'start'", () => {
            AppInsights.setup("key")
                .setAutoCollectConsole(false)
                .setAutoCollectExceptions(false)
                .setAutoCollectPerformance(false)
                .setAutoCollectRequests(false)
                .start();

            assert.ok(!Console.INSTANCE.isInitialized());
            assert.ok(!Exceptions.INSTANCE.isInitialized());
            assert.ok(!Performance.INSTANCE.isInitialized());
            assert.ok(!Requests.INSTANCE.isInitialized());
        });
    });
});