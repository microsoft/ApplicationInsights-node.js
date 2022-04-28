import * as assert from "assert";
import * as https from "https";
import * as sinon from "sinon";

import { QuickPulseStateManager } from "../../../src/library/quickPulse";
import * as Contracts from ".../../../src/declarations/Contracts";
import { AuthorizationHandler } from "../../../src/library/QuickPulse/AuthorizationHandler";
import { Config } from "../../../src/library/configuration";
import { QuickPulseSender } from "../../../src/library/QuickPulse/QuickPulseSender";
import { Util } from "../../../src/library/util";
import {
    KnownContextTagKeys,
    TelemetryItem as Envelope,
} from "../../../src/declarations/Generated";

describe("Library/QuickPulseStateManager", () => {
    Util.getInstance().tlsRestrictedAgent = new https.Agent();

    describe("#constructor", () => {
        let qps;
        afterEach(() => {
            qps = null;
        });

        it("should create a config with ikey", () => {
            qps = new QuickPulseStateManager(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));

            assert.ok(qps.config);
            assert.equal(qps.config.instrumentationKey, "1aa11111-bbbb-1ccc-8ddd-eeeeffff3333");
            assert.ok(qps.context);
            assert.equal(qps["_isEnabled"], false);
            assert.equal(qps["_isCollectingData"], false);
            assert.ok(qps["_sender"]);
            assert.ok(Object.keys(qps["_metrics"]).length === 0);
            assert.ok(qps["_documents"].length === 0);
            assert.ok(qps["_collectors"].length === 0);
        });
    });

    describe("#_goQuickPulsePingWithAllHeaders", () => {
        let qps: QuickPulseStateManager;
        let submitDataStub: sinon.SinonStub;
        let clock: sinon.SinonFakeTimers;

        beforeEach(() => {
            clock = sinon.useFakeTimers();
            qps = new QuickPulseStateManager(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
            submitDataStub = sinon.stub(qps["_sender"] as any, "_submitData");
        });
        afterEach(() => {
            qps = null;
            submitDataStub.restore();
            clock.restore();
        });

        it("should call _ping with all expected headers set set", () => {
            qps["context"].tags[KnownContextTagKeys.AiCloudRoleInstance] = "instance1";
            qps["context"].tags[KnownContextTagKeys.AiCloudRole] = "role1";
            qps.enable(true);

            let callArgs = submitDataStub.args;
            assert.equal((callArgs[0][4][0] as any)["name"], "x-ms-qps-stream-id");
            assert.ok((callArgs[0][4][0] as any)["value"].length > 0);
            assert.equal((callArgs[0][4][1] as any)["name"], "x-ms-qps-machine-name");
            assert.ok((callArgs[0][4][1] as any)["value"].length > 0);
            assert.equal((callArgs[0][4][2] as any)["name"], "x-ms-qps-role-name");
            assert.equal((callArgs[0][4][2] as any)["value"], "role1");
            assert.equal((callArgs[0][4][3] as any)["name"], "x-ms-qps-instance-name");
            assert.equal((callArgs[0][4][3] as any)["value"], "instance1");
            assert.equal((callArgs[0][4][4] as any)["name"], "x-ms-qps-invariant-version");
            assert.equal((callArgs[0][4][4] as any)["value"], "1");

            assert.equal(submitDataStub.callCount, 1);

            qps.enable(false);
        });

        it("should call _ping with all expected headers set", () => {
            qps.enable(true);
            qps["_redirectedHost"] = "www.example.com";

            let callArgs = submitDataStub.args;

            clock.tick(10000);

            qps.enable(false);

            assert.equal(submitDataStub.callCount, 3);
            assert.equal(callArgs[0][1], undefined);
            assert.equal(callArgs[1][1], "www.example.com");
            assert.equal(callArgs[2][1], "www.example.com");
        });
    });

    describe("#_goQuickPulse", () => {
        let qps: QuickPulseStateManager;

        beforeEach(() => {
            qps = new QuickPulseStateManager(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
        });
        afterEach(() => {
            qps = null;
        });

        it("should call _quickPulseDone and set the _rediectedHost and pollingIntervalHint", () => {
            qps["_quickPulseDone"](true, { statusCode: 200 } as any, "www.example.com", 2000);

            assert.equal(qps["_redirectedHost"], "www.example.com");
            assert.equal(qps["_pollingIntervalHint"], 2000);
            assert.equal(qps["_isCollectingData"], true);
            assert.equal(qps["_lastSendSucceeded"], true);
        });

        it("should call _quickPulseDone and not set the _rediectedHost and pollingIntervalHint if the arguments are null", () => {
            qps["_pollingIntervalHint"] = 2000;
            qps["_redirectedHost"] = "www.example.com";
            qps["_quickPulseDone"](true, { statusCode: 200 } as any, null, 0);

            assert.equal(qps["_redirectedHost"], "www.example.com");
            assert.equal(qps["_pollingIntervalHint"], 2000);

            qps["_quickPulseDone"](true, { statusCode: 200 } as any, "www.quickpulse.com", 5000);

            assert.equal(qps["_redirectedHost"], "www.quickpulse.com");
            assert.equal(qps["_pollingIntervalHint"], 5000);
        });
    });

    describe("#addDocuments", () => {
        var sandbox: sinon.SinonSandbox;
        let qps: QuickPulseStateManager;

        beforeEach(() => {
            sandbox = sinon.createSandbox();
            qps = new QuickPulseStateManager(new Config("1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"));
        });

        afterEach(() => {
            sandbox.restore();
            qps = null;
        });

        it("should add document if sending data", () => {
            sandbox.stub(qps as any, "_goQuickPulse");
            var testEnvelope: any = { name: "Test", tags: [] };
            testEnvelope.data = { baseType: "ExceptionData", baseData: {} };
            qps.enable(true);
            qps["_isCollectingData"] = true;
            assert.equal(qps["_documents"].length, 0);
            qps.addDocument(testEnvelope);
            assert.equal(qps["_documents"].length, 1);
        });

        it("should not add document if not sending data", () => {
            sandbox.stub(qps as any, "_goQuickPulse");
            var testEnvelope: Envelope = { name: "test", time: new Date() };
            qps.enable(true);
            assert.equal(qps["_documents"].length, 0);
            qps.addDocument(testEnvelope);
            assert.equal(qps["_documents"].length, 0);
        });
    });

    describe("#AuthorizationHandler ", () => {
        var sandbox: sinon.SinonSandbox;
        let envelope: Contracts.EnvelopeQuickPulse = {
            Documents: null,
            Instance: "",
            RoleName: "",
            InstrumentationKey: "",
            InvariantVersion: 1,
            MachineName: "",
            Metrics: null,
            StreamId: "",
            Timestamp: "",
            Version: "",
        };

        beforeEach(() => {
            sandbox = sinon.createSandbox();
        });

        afterEach(() => {
            sandbox.restore();
        });

        it("should add token if handler present", () => {
            var handler = new AuthorizationHandler({
                async getToken(scopes: string | string[], options?: any): Promise<any> {
                    return { token: "testToken" };
                },
            });
            var getAuthorizationHandler = () => {
                return handler;
            };
            var config = new Config("InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333;");
            var addHeaderStub = sandbox.stub(handler, "addAuthorizationHeader");
            let sender = new QuickPulseSender(config, getAuthorizationHandler);
            sender.post(envelope, "", () => {});
            assert.ok(addHeaderStub.calledOnce);
        });
    });
});
