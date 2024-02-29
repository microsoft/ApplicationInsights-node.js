// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import * as assert from "assert";
import * as sinon from "sinon";

import * as appInsights from "../../../src/index";
import { diag } from "@opentelemetry/api";
import { InstrumentationOptions } from "../../../src/types";
import { checkWarnings } from "./testUtils";

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
            const warnStub = sandbox.stub(diag, "warn");
            appInsights.setup(connString);
            for (let i = 0; i < warnStub.args.length; i++) {
                if (warnStub.args[i].includes("Setup has already been called once")) {
                    assert.ok(false, `setup warning was incorrectly raised: ${warnStub.args[i]}`);
                }
            }
            done();
        });
        it("should warn if setup is called twice", (done) => {
            const warnStub = sandbox.stub(diag, "warn");
            appInsights.setup(connString);
            appInsights.setup(connString);
            assert.ok(checkWarnings("Setup has already been called once", warnStub), "multiple setup warning not raised");
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
            const warnStub = sandbox.stub(diag, "warn");
            appInsights.start();
            assert.ok(checkWarnings("The default client has not been initialized. Please make sure to call setup() before start().", warnStub), "start before setup warning not called");
            done();
        });

        it("should not warn if start is called after setup", () => {
            var warnStub = sandbox.stub(diag, "warn");
            appInsights.setup(connString).start();
            assert.ok(!checkWarnings("The default client has not been initialized. Please make sure to call setup() before start().", warnStub), "warning was thrown when start was called correctly");
        });
    });

    describe("#setAutoCollect", () => {
        it("auto-collection is initialized by default", () => {
            appInsights.setup(connString);
            appInsights.start();
            assert.equal(appInsights.defaultClient["_options"].enableAutoCollectExceptions, true);
            assert.equal(appInsights.defaultClient["_options"].enableAutoCollectPerformance, true);
            assert.equal(JSON.stringify(appInsights.defaultClient["_options"].instrumentationOptions.bunyan), JSON.stringify({ enabled: true }));
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
            assert.equal(JSON.stringify(appInsights.defaultClient["_options"].instrumentationOptions.bunyan), JSON.stringify({ enabled: false }));
            assert.equal(JSON.stringify((appInsights.defaultClient["_options"].instrumentationOptions as InstrumentationOptions).console), JSON.stringify({ enabled: false }));
            assert.equal(JSON.stringify((appInsights.defaultClient["_options"].instrumentationOptions as InstrumentationOptions).winston), JSON.stringify({ enabled: false }));
        });

        describe("#CorrelationContext", () => {
            it("should return context once AppInsights is intialized", () => {
                appInsights.setup(connString).start();
                const context = appInsights.getCorrelationContext();
                assert.ok(context.operation.id);
            });
        });

        describe("#Configuration", () => {
            it("should throw warning if attempting to set AI distributed tracing mode to AI", () => {
                const warnStub = sandbox.stub(diag, "warn");
                appInsights.setup(connString);
                appInsights.Configuration.setDistributedTracingMode(appInsights.DistributedTracingModes.AI);
                appInsights.start();
                assert.ok(checkWarnings("AI only distributed tracing mode is no longer supported.", warnStub), "warning was not raised");
            });

            it("should warn if attempting to set auto collection of heartbeat", () => {
                const warnStub = sandbox.stub(diag, "warn");
                appInsights.setup(connString);
                appInsights.Configuration.setAutoCollectHeartbeat(true);
                appInsights.start();
                assert.ok(checkWarnings("Heartbeat metrics are no longer supported.", warnStub), "warning was not raised");
            });

            it("should warn if attempting to set maxBytesOnDisk", () => {
                const warnStub = sandbox.stub(diag, "warn");
                appInsights.setup(connString);
                appInsights.Configuration.setUseDiskRetryCaching(true, 1000, 10);
                appInsights.start();
                assert.ok(checkWarnings("The maxBytesOnDisk configuration option is not supported by the shim.", warnStub), "warning was not raised");
            });

            it("should set internal loggers", () => {
                appInsights.setup(connString);
                appInsights.Configuration.setInternalLogging(true, false);
                appInsights.start();
                assert.equal(process.env["APPLICATIONINSIGHTS_INSTRUMENTATION_LOGGING_LEVEL"], "DEBUG");
            });

            it("should warn if attempting to auto collect incoming azure functions requests", () => {
                const warnStub = sandbox.stub(diag, "warn");
                appInsights.setup(connString);
                appInsights.Configuration.setAutoCollectIncomingRequestAzureFunctions(true);
                appInsights.start();
                assert.ok(checkWarnings("Auto request generation in Azure Functions is no longer supported.", warnStub), "warning was not raised");
            });
        });
    });
});
