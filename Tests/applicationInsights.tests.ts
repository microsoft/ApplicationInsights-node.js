///<reference path="..\typings\globals\node\index.d.ts" />
///<reference path="..\typings\globals\mocha\index.d.ts" />
///<reference path="..\typings\globals\sinon\index.d.ts" />

import assert = require("assert");
import sinon = require("sinon");

describe("ApplicationInsights", () => {

    describe("#setup()", () => {
        var AppInsights = require("../applicationinsights");
        var Console = require("../AutoCollection/Console");
        var Exceptions = require("../AutoCollection/Exceptions");
        var Performance = require("../AutoCollection/Performance");
        var ServerRequests = require("../AutoCollection/ServerRequests");
        var ClientRequests = require("../AutoCollection/ClientRequests");
        beforeEach(() => {
            Console.INSTANCE = undefined;
            Exceptions.INSTANCE = undefined;
            Performance.INSTANCE = undefined;
            ServerRequests.INSTANCE = undefined;
            ClientRequests.INSTANCE = undefined;
        });

        it("should not warn if setup is called once", () => {
            var warnStub = sinon.stub(console, "warn");
            AppInsights.client = undefined;
            AppInsights.setup("key");
            assert.ok(warnStub.notCalled, "warning was not raised");
            warnStub.restore();
        });

        it("should warn if setup is called twice", () => {
            var warnStub = sinon.stub(console, "warn");
            AppInsights.client = undefined;
            AppInsights.setup("key");
            AppInsights.setup("key");
            assert.ok(warnStub.calledOn, "warning was raised");
            warnStub.restore();
        });

        it("should not overwrite default client if called more than once", () => {
            var warnStub = sinon.stub(console, "warn");
            AppInsights.client = undefined;
            AppInsights.setup("key");
            var client = AppInsights.client;
            AppInsights.setup("key");
            AppInsights.setup("key");
            AppInsights.setup("key");
            assert.ok(client === AppInsights.client, "client is not overwritten");
            warnStub.restore();
        });
    });

    describe("#start()", () => {
        var AppInsights = require("../applicationinsights");
        var Console = require("../AutoCollection/Console");
        var Exceptions = require("../AutoCollection/Exceptions");
        var Performance = require("../AutoCollection/Performance");
        var ServerRequests = require("../AutoCollection/ServerRequests");
        var ClientRequests = require("../AutoCollection/ClientRequests");

        beforeEach(() => {
            Console.INSTANCE = undefined;
            Exceptions.INSTANCE = undefined;
            Performance.INSTANCE = undefined;
            ServerRequests.INSTANCE = undefined;
            ClientRequests.INSTANCE = undefined;
        });

        afterEach(() => AppInsights.client = undefined);

        it("should warn if start is called before setup", () => {
            var warnStub = sinon.stub(console, "warn");
            AppInsights.start();
            assert.ok(warnStub.calledOn, "warning was raised");
            warnStub.restore();
        });

        it("should not warn if start is called after setup", () => {
            var warnStub = sinon.stub(console, "warn");
            AppInsights.setup("key").start();
            assert.ok(warnStub.notCalled, "warning was not raised");
            warnStub.restore();
        });
    });

    describe("#setAutoCollect", () => {
        var AppInsights = require("../applicationinsights");
        var Console = require("../AutoCollection/Console");
        var Exceptions = require("../AutoCollection/Exceptions");
        var Performance = require("../AutoCollection/Performance");
        var ServerRequests = require("../AutoCollection/ServerRequests");
        var ClientRequests = require("../AutoCollection/ClientRequests");

        beforeEach(() => {
            AppInsights.client = undefined;
            Console.INSTANCE = undefined;
            Exceptions.INSTANCE = undefined;
            Performance.INSTANCE = undefined;
            ServerRequests.INSTANCE = undefined;
            ClientRequests.INSTANCE = undefined;
        });

        it("auto-collection is initialized by default", () => {
            AppInsights.setup("key").start();

            //assert.ok(Console.INSTANCE.isInitialized());
            assert.ok(Exceptions.INSTANCE.isInitialized());
            assert.ok(Performance.INSTANCE.isInitialized());
            assert.ok(ServerRequests.INSTANCE.isInitialized());
            assert.ok(!ServerRequests.INSTANCE.isAutoCorrelating());
            assert.ok(ClientRequests.INSTANCE.isInitialized());
        });

        it("auto-collection is not initialized if disabled before 'start'", () => {
            AppInsights.setup("key")
                .setAutoCollectConsole(false)
                .setAutoCollectExceptions(false)
                .setAutoCollectPerformance(false)
                .setAutoCollectRequests(false)
                .setAutoCollectDependencies(false)
                .setAutoDependencyCorrelation(false)
                .start();

            assert.ok(!Console.INSTANCE.isInitialized());
            assert.ok(!Exceptions.INSTANCE.isInitialized());
            assert.ok(!Performance.INSTANCE.isInitialized());
            assert.ok(!ServerRequests.INSTANCE.isInitialized());
            assert.ok(!ServerRequests.INSTANCE.isAutoCorrelating());
            assert.ok(!ClientRequests.INSTANCE.isInitialized());
        });
    });
});