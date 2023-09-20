import * as assert from "assert";
import * as sinon from "sinon";

import * as appInsights from "../../../src/index";

describe("ApplicationInsights", () => {
    let sandbox: sinon.SinonSandbox;
    const connString: string = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;IngestionEndpoint=https://centralus-0.in.applicationinsights.azure.com/"
    before(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
        appInsights.dispose();
    });

    describe("#setup()", () => {
        it("should not warn if setup is called once", (done) => {
            const warnStub = sandbox.stub(console, "warn");
            appInsights.setup(connString);
            assert.ok(warnStub.notCalled, "warning was not raised");
            done();
        });
        it("should warn if setup is called twice", (done) => {
            const warnStub = sandbox.stub(console, "warn");
            appInsights.setup(connString);
            appInsights.setup(connString);
            assert.ok(warnStub.calledOn, "warning was raised");
            done();
        });
        it("should not overwrite default client if called more than once", (done) => {
            appInsights.setup(connString);
            var client = appInsights.defaultClient;
            appInsights.setup(connString);
            appInsights.setup(connString);
            appInsights.setup(connString);
            assert.ok(JSON.stringify(client) === JSON.stringify(appInsights.defaultClient), "client is not overwritten");
            done();
        });
    });

    describe("#start()", () => {
        it("should warn if start is called before setup", (done) => {
            const warnStub = sandbox.stub(console, "warn");
            appInsights.start();
            assert.ok(warnStub.calledOn, "warning was raised");
            done();
        });

        it("should not warn if start is called after setup", () => {
            var warnStub = sandbox.stub(console, "warn");
            appInsights.setup(connString).start();
            assert.ok(warnStub.notCalled, "warning was not raised");
        });
    });

    describe("#setAutoCollect", () => {
        it("auto-collection is initialized by default", () => {
            appInsights.setup(connString);
            appInsights.start();
            assert.equal(appInsights.defaultClient["_options"].enableAutoCollectExceptions, true);
            assert.equal(appInsights.defaultClient["_options"].enableAutoCollectPerformance, true);
            assert.equal(JSON.stringify(appInsights.defaultClient["_options"].logInstrumentationOptions.bunyan), JSON.stringify({ enabled: true }));
        });

        it("auto-collection is not initialized if disabled before 'start'", () => {
            appInsights.setup(connString)
                .setAutoCollectConsole(false)
                .setAutoCollectExceptions(false)
                .setAutoCollectPerformance(false, false)
                .setAutoCollectRequests(false)
                .setAutoCollectDependencies(false)
                .setAutoDependencyCorrelation(false);
            appInsights.start();
            assert.equal(appInsights.defaultClient["_options"].enableAutoCollectExceptions, false);
            assert.equal(appInsights.defaultClient["_options"].enableAutoCollectPerformance, false);
            assert.equal(JSON.stringify(appInsights.defaultClient["_options"].logInstrumentationOptions.bunyan), JSON.stringify({ enabled: false }));
            assert.equal(JSON.stringify(appInsights.defaultClient["_options"].logInstrumentationOptions.console), JSON.stringify({ enabled: false }));
            assert.equal(JSON.stringify(appInsights.defaultClient["_options"].logInstrumentationOptions.winston), JSON.stringify({ enabled: false }));
        });
    });
});
