import * as assert from "assert";
import * as sinon from "sinon";
import * as nock from "nock";
import { Logger } from "@opentelemetry/api-logs";
import { LogRecord } from "@opentelemetry/sdk-logs";

import {
    AvailabilityTelemetry,
    EventTelemetry,
    ExceptionTelemetry,
    PageViewTelemetry,
    Telemetry,
    TraceTelemetry
} from "../../../src/declarations/contracts";
import { DEFAULT_BREEZE_ENDPOINT } from "../../../src/declarations/constants";
import { AvailabilityData, MessageData, MonitorDomain, PageViewData, TelemetryEventData, TelemetryExceptionData } from "../../../src/declarations/generated";
import { LogApi } from "../../../src/logs/api";

describe("logs/API", () => {
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

    class TestLogger implements Logger {

        public logsEmited: Array<LogRecord> = [];

        emit(logRecord: LogRecord): void {
            this.logsEmited.push(logRecord);
        }
    }

    describe("#manual track APIs", () => {
        it("_logToEnvelope", () => {
            let testLogger = new TestLogger();
            let logApi = new LogApi(testLogger);
            const telemetry: Telemetry = {
                properties: { "testAttribute": "testValue" }
            };
            const data: MonitorDomain = {};
            const logRecord = logApi["_telemetryToLogRecord"](
                telemetry,
                "TestData",
                data,
            ) as LogRecord;
            assert.equal(logRecord.body, "{}");
            assert.equal(logRecord.attributes["testAttribute"], "testValue");
            assert.equal(logRecord.attributes["_MS.baseType"], "TestData");
        });

        it("trackAvailability", () => {
            let testLogger = new TestLogger();
            let logApi = new LogApi(testLogger);
            const telemetry: AvailabilityTelemetry = {
                name: "TestName",
                duration: 2000, //2 seconds
                id: "testId",
                runLocation: "testRunLocation",
                message: "testMessage",
                success: false,
            };
            logApi.trackAvailability(telemetry);
            const logs = testLogger.logsEmited;
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
        });

        it("trackPageView", () => {
            let testLogger = new TestLogger();
            let logApi = new LogApi(testLogger);
            const telemetry: PageViewTelemetry = {
                name: "TestName",
                duration: 2000, //2 seconds
                id: "testId",
                referredUri: "testReferredUri",
                url: "testUrl",
            };
            logApi.trackPageView(telemetry);
            const logs = testLogger.logsEmited;
            assert.equal(logs.length, 1);
            let baseData = JSON.parse(logs[0].body) as PageViewData;
            assert.equal(baseData.version, 2);
            assert.equal(baseData.id, "testId");
            assert.equal(baseData.name, "TestName");
            assert.equal(baseData.duration, "00:00:02.000");
            assert.equal(baseData.referredUri, "testReferredUri");
            assert.equal(baseData.url, "testUrl");
            assert.equal(logs[0].attributes["_MS.baseType"], "PageViewData");
        });

        it("trackTrace", () => {
            let testLogger = new TestLogger();
            let logApi = new LogApi(testLogger);
            const telemetry: TraceTelemetry = {
                message: "testMessage",
                severity: "Information",
            };
            logApi.trackTrace(telemetry);
            const logs = testLogger.logsEmited;
            assert.equal(logs.length, 1);
            let baseData = JSON.parse(logs[0].body) as MessageData;
            assert.equal(baseData.version, 2);
            assert.equal(baseData.message, "testMessage");
            assert.equal(baseData.severityLevel, "Information");
            assert.equal(logs[0].attributes["_MS.baseType"], "MessageData");
        });

        it("trackException", () => {
            let testLogger = new TestLogger();
            let logApi = new LogApi(testLogger);
            const measurements: { [key: string]: number } = {};
            measurements["test"] = 123;
            const telemetry: ExceptionTelemetry = {
                exception: new Error("TestError"),
                severity: "Critical",
                measurements: measurements,
            };
            logApi.trackException(telemetry);
            const logs = testLogger.logsEmited;
            assert.equal(logs.length, 1);
            let baseData = JSON.parse(logs[0].body) as TelemetryExceptionData;
            assert.equal(baseData.version, 2);
            assert.equal(baseData.severityLevel, "Critical");
            assert.equal(baseData.exceptions[0].message, "TestError");
            assert.equal(baseData.exceptions[0].typeName, "Error");
            assert.equal(baseData.measurements["test"], 123);
            assert.equal(logs[0].attributes["_MS.baseType"], "ExceptionData");
        });

        it("trackEvent", () => {
            let testLogger = new TestLogger();
            let logApi = new LogApi(testLogger);
            const measurements: { [key: string]: number } = {};
            measurements["test"] = 123;
            const telemetry: EventTelemetry = {
                name: "TestName",
                measurements: measurements,
            };
            logApi.trackEvent(telemetry);
            const logs = testLogger.logsEmited;
            assert.equal(logs.length, 1);
            let baseData = JSON.parse(logs[0].body) as TelemetryEventData;
            assert.equal(baseData.version, 2);
            assert.equal(baseData.name, "TestName");
            assert.equal(baseData.measurements["test"], 123);
            assert.equal(logs[0].attributes["_MS.baseType"], "EventData");
        });
    });
});
