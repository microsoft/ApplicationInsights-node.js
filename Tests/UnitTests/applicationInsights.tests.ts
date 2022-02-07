import * as assert from "assert";
import * as sinon from "sinon";

import * as AppInsights from "../../applicationinsights";
import * as Contracts from "../../Declarations/Contracts";
import { AutoCollectConsole } from "../../AutoCollection/Console";
import { AutoCollectExceptions } from "../../AutoCollection/Exceptions";


describe("ApplicationInsights", () => {

    var sandbox: sinon.SinonSandbox;
    before(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
        AppInsights.dispose();
    });

    describe("#setup()", () => {
        it("should not warn if setup is called once", () => {
            var warnStub = sandbox.stub(console, "warn");
            AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            assert.ok(warnStub.notCalled, "warning was not raised");
        });

        it("should warn if setup is called twice", () => {
            var warnStub = sandbox.stub(console, "warn");
            AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            assert.ok(warnStub.calledOn, "warning was raised");
        });

        it("should not overwrite default client if called more than once", () => {
            var warnStub = sandbox.stub(console, "warn");
            AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            var client = AppInsights.defaultClient;
            AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            assert.ok(client === AppInsights.defaultClient, "client is not overwritten");
        });
    });

    describe("#start()", () => {
        it("should warn if start is called before setup", () => {
            var warnStub = sandbox.stub(console, "warn");
            AppInsights.start();
            assert.ok(warnStub.calledOn, "warning was raised");
        });

        it("should not warn if start is called after setup", () => {
            var warnStub = sandbox.stub(console, "warn");
            AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").start();
            assert.ok(warnStub.notCalled, "warning was not raised");
        });

        it("should not start live metrics", () => {
            AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").start();
            assert.equal(AppInsights.liveMetricsClient, undefined, "live metrics client is not defined");
        });

        it("should not start live metrics", () => {
            AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").setSendLiveMetrics(false).start();
            assert.equal(AppInsights.liveMetricsClient, undefined, "live metrics client is not defined");
        });
    });

    describe("#setAutoCollect", () => {

        it("auto-collection is initialized by default", () => {
            AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333").start();
            assert.ok(AppInsights.defaultClient.autoCollector["_console"].isInitialized());
            assert.ok(AppInsights.defaultClient.autoCollector["_exceptions"].isInitialized());
            assert.ok(AppInsights.defaultClient.autoCollector["_performance"].isInitialized());
        });

        it("auto-collection is not initialized if disabled before 'start'", () => {
            AppInsights.setup("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333")
                .setAutoCollectConsole(false)
                .setAutoCollectExceptions(false)
                .setAutoCollectPerformance(false)
                .setAutoCollectRequests(false)
                .setAutoCollectDependencies(false)
                .setAutoDependencyCorrelation(false)
                .start();

            assert.ok(!AppInsights.defaultClient.autoCollector["_console"].isInitialized());
            assert.ok(!AppInsights.defaultClient.autoCollector["_exceptions"].isInitialized());
            assert.ok(!AppInsights.defaultClient.autoCollector["_performance"].isInitialized());
        });
    });

    describe("#Provide access to contracts", () => {
        it("should provide access to severity levels", () => {
            assert.equal(AppInsights.Contracts.SeverityLevel.Information, Contracts.SeverityLevel.Information);
        });
    });
});
