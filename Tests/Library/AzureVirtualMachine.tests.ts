import assert = require("assert");
import sinon = require("sinon");
import nock = require("nock");
import AppInsights = require("../../applicationinsights");
import { AzureVirtualMachine } from "../../Library/AzureVirtualMachine";
import Vm = require("../../Library/AzureVirtualMachine");
import Constants = require("../../Declarations/Constants");

describe("Library/AzureVirtualMachine", () => {
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

    describe("#getAzureComputeMetadata", () => {
        afterEach(() => {
            AzureVirtualMachine.HTTP_TIMEOUT = 2500;
        });

        it("should timeout effectively when calling getAzureComputeMetadata", () => {
            const client = new AppInsights.TelemetryClient("key");
            nockScope = interceptor.delay(300).reply(200);
            AzureVirtualMachine.HTTP_TIMEOUT = 200;

            let onErrorSpy = sandbox.spy(AzureVirtualMachine, "getAzureComputeMetadata");
            Vm.AzureVirtualMachine.getAzureComputeMetadata(client.config, () => {
                assert.ok(onErrorSpy.calledOnce);
            });
        });
    });
});
