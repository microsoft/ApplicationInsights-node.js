import assert = require("assert");
import sinon = require("sinon");
import nock = require("nock");
import AppInsights = require("../../applicationinsights");
import Constants = require("../../Declarations/Constants");
import CorrelationIdManager = require("../../Library/CorrelationIdManager");

describe("Library/CorrelationIdManager", () => {
    var sandbox: sinon.SinonSandbox;
    let interceptor: nock.Interceptor;
    let nockScope: nock.Scope;

    before(() => {
        interceptor = nock(Constants.DEFAULT_BREEZE_ENDPOINT)
            .post("/v2.1/track", (body: string) => {
                return true;
            });
    });

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    after(() => {
        nock.cleanAll();
    });

    describe("#queryCorrelationId", () => {
        afterEach(() => {
            CorrelationIdManager.HTTP_TIMEOUT = 2500;
        });

        it("should timeout effectively when calling queryCorrelationId", () => {
            const client = new AppInsights.TelemetryClient("key");
            nockScope = interceptor.delay(300).reply(200);
            CorrelationIdManager.HTTP_TIMEOUT = 200;

            let onErrorSpy = sandbox.spy(CorrelationIdManager, "queryCorrelationId");
            CorrelationIdManager.queryCorrelationId(client.config, () => {
                assert.ok(onErrorSpy.calledOnce);
                let error = onErrorSpy.args[0][0] as Error;
                assert.equal(error.message, "telemetry request timed out");
            });
        });
    });
});