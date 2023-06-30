import * as assert from "assert";
import * as sinon from "sinon";
import * as nock from "nock";
import { ExportResultCode } from "@opentelemetry/core";
import { LogRecord } from "@opentelemetry/sdk-logs";
import {
    AvailabilityTelemetry, DependencyTelemetry,
    EventTelemetry, ExceptionTelemetry,
    PageViewTelemetry, RequestTelemetry, Telemetry,
    TraceTelemetry
} from "../../../src/declarations/contracts";
import { TelemetryClient } from "../../../src/shim/telemetryClient";
import { DEFAULT_BREEZE_ENDPOINT } from "../../../src/declarations/constants";
import { AvailabilityData, MessageData, MonitorDomain, PageViewData, TelemetryEventData, TelemetryExceptionData } from "../../../src/declarations/generated";

describe("shim/TelemetryClient", () => {
    let sandbox: sinon.SinonSandbox;
    let client: TelemetryClient;
    let traceExportStub: sinon.SinonStub;
    let logExportStub: sinon.SinonStub;

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
        client.shutdown();
    });

    after(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    function createTelemetryClient() {
        client = new TelemetryClient(
            "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333"
        );
        traceExportStub = sinon.stub(client["_client"]["_traceHandler"]["_azureExporter"], "export").callsFake(
            (data: any, resultCallback: any) =>
                new Promise((resolve) => {
                    resultCallback({
                        code: ExportResultCode.SUCCESS,
                    });
                    resolve(data);
                })
        );
        logExportStub = sinon.stub(client["_client"]["_logHandler"]["_azureExporter"], "export").callsFake(
            (data: any, resultCallback: any) =>
                new Promise((resolve) => {
                    resultCallback({
                        code: ExportResultCode.SUCCESS,
                    });
                    resolve(data);
                })
        );
    }

    describe("#manual track APIs", () => {
        it("trackDependency http", (done) => {
            createTelemetryClient();
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
                    assert.ok(traceExportStub.calledOnce, "Export called");
                    const spans = traceExportStub.args[0][0];
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
            createTelemetryClient();
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
                    assert.ok(traceExportStub.calledOnce, "Export called");
                    const spans = traceExportStub.args[0][0];
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
            createTelemetryClient();
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
                    assert.ok(traceExportStub.calledOnce, "Export called");
                    const spans = traceExportStub.args[0][0];
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

        it("_logToEnvelope", () => {
            createTelemetryClient();
            const telemetry: Telemetry = {
                properties: { "testAttribute": "testValue" }
            };
            const data: MonitorDomain = {};
            const logRecord = client["_telemetryToLogRecord"](
                telemetry,
                "TestData",
                data,
            ) as LogRecord;
            assert.equal(logRecord.body, "{}");
            assert.equal(logRecord.attributes["testAttribute"], "testValue");
            assert.equal(logRecord.attributes["_MS.baseType"], "TestData");
        });

        it("trackAvailability", (done) => {
            createTelemetryClient();
            const telemetry: AvailabilityTelemetry = {
                name: "TestName",
                duration: 2000, //2 seconds
                id: "testId",
                runLocation: "testRunLocation",
                message: "testMessage",
                success: false,
            };
            client.trackAvailability(telemetry);
            client
                .flush()
                .then(() => {
                    assert.ok(logExportStub.calledOnce, "Export called");
                    const logs = logExportStub.args[0][0];
                    assert.equal(logs.length, 1);
                    let baseData = JSON.parse(logs[0].body) as AvailabilityData;
                    assert.equal(baseData.version, 2);
                    assert.equal(baseData.id, "testId");
                    assert.equal(baseData.name, "TestName");
                    assert.equal(baseData.duration, "00:00:02.000");
                    assert.equal(baseData.success, false);
                    assert.equal(baseData.runLocation, "testRunLocation");
                    assert.equal(baseData.message, "testMessage");
                    assert.equal(logs[0].attributes["_MS.baseType"], "AvailabilityData");
                    assert.equal(logs[0].instrumentationScope.name, "AzureMonitorLogger");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("trackPageView", (done) => {
            createTelemetryClient();
            const telemetry: PageViewTelemetry = {
                name: "TestName",
                duration: 2000, //2 seconds
                id: "testId",
                referredUri: "testReferredUri",
                url: "testUrl",
            };
            client.trackPageView(telemetry);
            client
                .flush()
                .then(() => {
                    assert.ok(logExportStub.calledOnce, "Export called");
                    const logs = logExportStub.args[0][0];
                    assert.equal(logs.length, 1);
                    let baseData = JSON.parse(logs[0].body) as PageViewData;
                    assert.equal(baseData.version, 2);
                    assert.equal(baseData.id, "testId");
                    assert.equal(baseData.name, "TestName");
                    assert.equal(baseData.duration, "00:00:02.000");
                    assert.equal(baseData.referredUri, "testReferredUri");
                    assert.equal(baseData.url, "testUrl");
                    assert.equal(logs[0].attributes["_MS.baseType"], "PageViewData");
                    assert.equal(logs[0].instrumentationScope.name, "AzureMonitorLogger");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("trackTrace", (done) => {
            createTelemetryClient();
            const telemetry: TraceTelemetry = {
                message: "testMessage",
                severity: "Information",
            };
            client.trackTrace(telemetry);
            client
                .flush()
                .then(() => {
                    assert.ok(logExportStub.calledOnce, "Export called");
                    const logs = logExportStub.args[0][0];
                    assert.equal(logs.length, 1);
                    let baseData = JSON.parse(logs[0].body) as MessageData;
                    assert.equal(baseData.version, 2);
                    assert.equal(baseData.message, "testMessage");
                    assert.equal(baseData.severityLevel, "Information");
                    assert.equal(logs[0].attributes["_MS.baseType"], "MessageData");
                    assert.equal(logs[0].instrumentationScope.name, "AzureMonitorLogger");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("trackException", (done) => {
            createTelemetryClient();
            const measurements: { [key: string]: number } = {};
            measurements["test"] = 123;
            const telemetry: ExceptionTelemetry = {
                exception: new Error("TestError"),
                severity: "Critical",
                measurements: measurements,
            };
            client.trackException(telemetry);
            client
                .flush()
                .then(() => {
                    assert.ok(logExportStub.calledOnce, "Export called");
                    const logs = logExportStub.args[0][0];
                    assert.equal(logs.length, 1);
                    let baseData = JSON.parse(logs[0].body) as TelemetryExceptionData;
                    assert.equal(baseData.version, 2);
                    assert.equal(baseData.severityLevel, "Critical");
                    assert.equal(baseData.exceptions[0].message, "TestError");
                    assert.equal(baseData.exceptions[0].typeName, "Error");
                    assert.equal(baseData.measurements["test"], 123);
                    assert.equal(logs[0].attributes["_MS.baseType"], "ExceptionData");
                    assert.equal(logs[0].instrumentationScope.name, "AzureMonitorLogger");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("trackEvent", (done) => {
            createTelemetryClient();
            const measurements: { [key: string]: number } = {};
            measurements["test"] = 123;
            const telemetry: EventTelemetry = {
                name: "TestName",
                measurements: measurements,
            };
            client.trackEvent(telemetry);
            client
                .flush()
                .then(() => {
                    assert.ok(logExportStub.calledOnce, "Export called");
                    const logs = logExportStub.args[0][0];
                    assert.equal(logs.length, 1);
                    let baseData = JSON.parse(logs[0].body) as TelemetryEventData;
                    assert.equal(baseData.version, 2);
                    assert.equal(baseData.name, "TestName");
                    assert.equal(baseData.measurements["test"], 123);
                    assert.equal(logs[0].attributes["_MS.baseType"], "EventData");
                    assert.equal(logs[0].instrumentationScope.name, "AzureMonitorLogger");
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });
    });
});
