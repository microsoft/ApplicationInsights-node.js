import assert = require("assert");
import sinon = require("sinon");

describe("ApplicationInsights", () => {

    describe("#setup()", () => {
        var AppInsights = require("../applicationinsights");
        var Console = require("../AutoCollection/Console");
        var Exceptions = require("../AutoCollection/Exceptions");
        var Performance = require("../AutoCollection/Performance");
        var HttpRequests = require("../AutoCollection/HttpRequests");
        var HttpDependencies = require("../AutoCollection/HttpDependencies");
        beforeEach(() => {
            Console.INSTANCE = undefined;
            Exceptions.INSTANCE = undefined;
            Performance.INSTANCE = undefined;
            HttpRequests.INSTANCE = undefined;
            HttpDependencies.INSTANCE = undefined;
        });

        afterEach(() => {
            AppInsights.dispose();
        })

        it("should not warn if setup is called once", () => {
            var warnStub = sinon.stub(console, "warn");
            AppInsights.defaultClient = undefined;
            AppInsights.setup("key");
            assert.ok(warnStub.notCalled, "warning was not raised");
            warnStub.restore();
        });

        it("should warn if setup is called twice", () => {
            var warnStub = sinon.stub(console, "warn");
            AppInsights.defaultClient = undefined;
            AppInsights.setup("key");
            AppInsights.setup("key");
            assert.ok(warnStub.calledOn, "warning was raised");
            warnStub.restore();
        });

        it("should overwrite default client if called more than once", () => {
            var warnStub = sinon.stub(console, "warn");
            AppInsights.defaultClient = undefined;
            AppInsights.setup("key");
            var client = JSON.parse(JSON.stringify(AppInsights.defaultClient));
            AppInsights.setup("key2");
            assert.notDeepEqual(AppInsights.defaultClient, client, "client is overwritten #1");

            client = JSON.parse(JSON.stringify(AppInsights.defaultClient));
            AppInsights.setup("key3");
            assert.notDeepEqual(AppInsights.defaultClient, client, "client is overwritten #2");

            client = JSON.parse(JSON.stringify(AppInsights.defaultClient));
            AppInsights.setup("key4");
            assert.equal(AppInsights.defaultClient.config.instrumentationKey, "key4");
            assert.notDeepEqual(AppInsights.defaultClient, client, "client is overwritten #3");
            warnStub.restore();
        });

        it("should cancel [console] autocollection is setup called again", () => {
            var warnStub = sinon.stub(console, "warn");

            AppInsights.defaultClient = null;
            AppInsights.setup("key").setAutoCollectConsole(true, true).start();

            var traceStub = sinon.stub(AppInsights.defaultClient, "trackTrace");
            assert.ok(traceStub.notCalled);
            console.log('test log');
            assert.ok(traceStub.calledOnce);
            assert.ok(traceStub.calledWith({message: "test log", severity: 1}));

            traceStub.reset();
            assert.ok(traceStub.notCalled);
            AppInsights.setup("key").setAutoCollectConsole(false, false);
            console.log('test log 2');
            assert.ok(traceStub.notCalled);

            warnStub.restore();
            traceStub.restore();
        })
    });

    describe("#start()", () => {
        var AppInsights = require("../applicationinsights");
        var Console = require("../AutoCollection/Console");
        var Exceptions = require("../AutoCollection/Exceptions");
        var Performance = require("../AutoCollection/Performance");
        var HttpRequests = require("../AutoCollection/HttpRequests");
        var HttpDependencies = require("../AutoCollection/HttpDependencies");

        beforeEach(() => {
            Console.INSTANCE = undefined;
            Exceptions.INSTANCE = undefined;
            Performance.INSTANCE = undefined;
            HttpRequests.INSTANCE = undefined;
            HttpDependencies.INSTANCE = undefined;
        });

        afterEach(() => AppInsights.defaultClient = undefined);

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
        var HttpRequests = require("../AutoCollection/HttpRequests");
        var HttpDependencies = require("../AutoCollection/HttpDependencies");

        beforeEach(() => {
            AppInsights.defaultClient = undefined;
            Console.INSTANCE = undefined;
            Exceptions.INSTANCE = undefined;
            Performance.INSTANCE = undefined;
            HttpRequests.INSTANCE = undefined;
            HttpDependencies.INSTANCE = undefined;
        });

        it("auto-collection is initialized by default", () => {
            AppInsights.setup("key").start();

            //assert.ok(Console.INSTANCE.isInitialized());
            assert.ok(Exceptions.INSTANCE.isInitialized());
            assert.ok(Performance.INSTANCE.isInitialized());
            assert.ok(HttpRequests.INSTANCE.isInitialized());
            assert.ok(HttpRequests.INSTANCE.isAutoCorrelating());
            assert.ok(HttpDependencies.INSTANCE.isInitialized());
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
            assert.ok(!HttpRequests.INSTANCE.isInitialized());
            assert.ok(!HttpRequests.INSTANCE.isAutoCorrelating());
            assert.ok(!HttpDependencies.INSTANCE.isInitialized());
        });
    });

    describe("#Provide access to contracts", () => {
        var AppInsights = require("../applicationinsights");
        var Contracts = require("../Declarations/Contracts");

        it("should provide access to severity levels", () => {
            assert.equal(AppInsights.Contracts.SeverityLevel.Information, Contracts.SeverityLevel.Information);
        });
    });

    describe("#getCorrelationContext", () => {
        var AppInsights = require("../applicationinsights");
        var Contracts = require("../Declarations/Contracts");
        var CCM = require("../AutoCollection/CorrelationContextManager").CorrelationContextManager;
        var origGCC = CCM.getCurrentContext;

        beforeEach(() => {
            CCM.getCurrentContext = () => 'context';
        });

        afterEach(() => {
            CCM.getCurrentContext = origGCC;
            CCM.hasEverEnabled = false;
            CCM.cls = undefined;
            CCM.disable();
            AppInsights.dispose();
        });

        it("should provide a context if correlating", () => {
            AppInsights.setup("key")
            .setAutoDependencyCorrelation(true)
            .start();
            assert.equal(AppInsights.getCorrelationContext(), 'context');
        });

        it("should provide a cls-hooked context if force flag set to true", () => {
            if (CCM.canUseClsHooked()) {
                AppInsights.setup("key")
                .setAutoDependencyCorrelation(true, true)
                .start();
                assert.equal(AppInsights.getCorrelationContext(), 'context');
                if (CCM.isNodeVersionCompatible()) {
                    assert.equal(CCM.cls, require('cls-hooked'));
                }
            }
        });

        it("should provide a continuation-local-storage context if force flag set to false", () => {
            AppInsights.setup("key")
            .setAutoDependencyCorrelation(true, false)
            .start();
            assert.equal(AppInsights.getCorrelationContext(), 'context');
            if (CCM.isNodeVersionCompatible()) {
                assert.equal(CCM.cls, require('continuation-local-storage'));
            }
        });

        it("should not provide a context if not correlating", () => {
            AppInsights.setup("key")
            .setAutoDependencyCorrelation(false)
            .start();
            assert.equal(AppInsights.getCorrelationContext(), null);
        });
    });
});
