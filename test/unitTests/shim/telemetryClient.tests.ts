import * as assert from "assert";
import * as sinon from "sinon";
import * as nock from "nock";
import { ExportResultCode } from "@opentelemetry/core";
import { DependencyTelemetry, RequestTelemetry } from "../../../src/declarations/contracts";
import { TelemetryClient } from "../../../src/shim/telemetryClient";
import { DEFAULT_BREEZE_ENDPOINT } from "../../../src/declarations/constants";
import { ApplicationInsightsConfig } from "../../../src/shared/configuration/applicationInsightsConfig";

describe("shim/TelemetryClient", () => {
    let sandbox: sinon.SinonSandbox;

    before(() => {
        sandbox = sinon.createSandbox();
        nock(DEFAULT_BREEZE_ENDPOINT)
            .post("/v2.1/track", (body: string) => true)
            .reply(200, {})
            .persist();
        nock.disableNetConnect();
    });

    afterEach(() => {
        sandbox.restore();
    });

    after(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    describe("#manual track APIs", () => {
        it("trackDependency http", (done) => {
            const client = new TelemetryClient(
                "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"
            );
            const stub = sinon
                .stub(client.client.getTraceHandler()["_azureMonitorExporter"], "export")
                .callsFake(
                    (spans: any, resultCallback: any) =>
                        new Promise((resolve, reject) => {
                            resultCallback({
                                code: ExportResultCode.SUCCESS,
                            });
                            resolve();
                        })
                );
            const telemetry: DependencyTelemetry = {
                name: "TestName",
                duration: 2000, //2 seconds
                resultCode: "401",
                data: "http://test.com",
                dependencyTypeName: "HTTP",
                target: "TestTarget",
                success: false,
            };
            client.trackDependency(telemetry);
            client
                .flush()
                .then(() => {
                    assert.ok(stub.calledOnce, "Export called");
                    const spans = stub.args[0][0];
                    assert.equal(spans.length, 1);
                    assert.equal(spans[0].name, "TestName");
                    assert.equal(spans[0].endTime[0] - spans[0].startTime[0], 2); // hrTime UNIX Epoch time in seconds
                    assert.equal(spans[0].kind, 2, "Span Kind"); // Outgoing
                    assert.equal(spans[0].attributes["http.method"], "HTTP");
                    assert.equal(spans[0].attributes["http.status_code"], "401");
                    assert.equal(spans[0].attributes["http.url"], "http://test.com");
                    assert.equal(spans[0].attributes["peer.service"], "TestTarget");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("trackDependency DB", (done) => {
            const client = new TelemetryClient(
                "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"
            );
            const stub = sinon
                .stub(client.client.getTraceHandler()["_azureMonitorExporter"], "export")
                .callsFake(
                    (spans: any, resultCallback: any) =>
                        new Promise((resolve, reject) => {
                            resultCallback({
                                code: ExportResultCode.SUCCESS,
                            });
                            resolve();
                        })
                );
            const telemetry: DependencyTelemetry = {
                name: "TestName",
                duration: 2000, //2 seconds
                resultCode: "401",
                data: "SELECT * FROM test",
                dependencyTypeName: "MYSQL",
                target: "TestTarget",
                success: false,
            };
            client.trackDependency(telemetry);
            client
                .flush()
                .then(() => {
                    assert.ok(stub.calledOnce, "Export called");
                    const spans = stub.args[0][0];
                    assert.equal(spans.length, 1);
                    assert.equal(spans[0].name, "TestName");
                    assert.equal(spans[0].kind, 2, "Span Kind"); // Outgoing
                    assert.equal(spans[0].attributes["db.system"], "MYSQL");
                    assert.equal(spans[0].attributes["db.statement"], "SELECT * FROM test");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("trackRequest", (done) => {
            const client = new TelemetryClient(
                "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"
            );
            const stub = sinon
                .stub(client.client.getTraceHandler()["_azureMonitorExporter"], "export")
                .callsFake(
                    (spans: any, resultCallback: any) =>
                        new Promise((resolve, reject) => {
                            resultCallback({
                                code: ExportResultCode.SUCCESS,
                            });
                            resolve();
                        })
                );
            const telemetry: RequestTelemetry = {
                id: "123456",
                name: "TestName",
                duration: 2000, //2 seconds
                resultCode: "401",
                url: "http://test.com",
                success: false,
            };
            client.trackRequest(telemetry);
            client
                .flush()
                .then(() => {
                    assert.ok(stub.calledOnce, "Export called");
                    const spans = stub.args[0][0];
                    assert.equal(spans.length, 1);
                    assert.equal(spans[0].name, "TestName");
                    assert.equal(spans[0].endTime[0] - spans[0].startTime[0], 2); // hrTime UNIX Epoch time in seconds
                    assert.equal(spans[0].kind, 1, "Span Kind"); // Incoming
                    assert.equal(spans[0].attributes["http.method"], "HTTP");
                    assert.equal(spans[0].attributes["http.status_code"], "401");
                    assert.equal(spans[0].attributes["http.url"], "http://test.com");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });
    });
});
