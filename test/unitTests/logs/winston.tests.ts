import * as assert from "assert";
import { channel } from "diagnostic-channel";
import { winston } from "diagnostic-channel-publishers";
import { SeverityNumber, logs } from '@opentelemetry/api-logs';
import {
    LoggerProvider,
    SimpleLogRecordProcessor,
    InMemoryLogRecordExporter,
} from '@opentelemetry/sdk-logs';
import { dispose } from "../../../src/logs/diagnostic-channel/winston.sub";
import { AutoCollectLogs } from "../../../src/logs/autoCollectLogs";


describe("diagnostic-channel/winston", () => {
    let memoryLogExporter: InMemoryLogRecordExporter;

    before(() => {
        logs.disable();
        const loggerProvider = new LoggerProvider();
        memoryLogExporter = new InMemoryLogRecordExporter();
        loggerProvider.addLogRecordProcessor(
            new SimpleLogRecordProcessor(memoryLogExporter)
        );
        logs.setGlobalLoggerProvider(loggerProvider);
    });

    beforeEach(() => {
        memoryLogExporter.getFinishedLogRecords().length = 0; // clear
    });

    afterEach(() => {
        dispose();
    });

    it("should emit log for errors", () => {
        let autoCollect = new AutoCollectLogs();
        autoCollect.enable({
            winston: { enabled: true }
        });
        const dummyError = new Error("test error");
        const errorEvent: winston.IWinstonData = {
            message: dummyError as any,
            meta: {test: "testValue", test1: "testValue1"},
            level: "error",
            levelKind: "npm",
        };
        channel.publish("winston", errorEvent);
        const logRecords = memoryLogExporter.getFinishedLogRecords();
        assert.strictEqual(logRecords.length, 1);
        assert.strictEqual(logRecords[0].body, "Error: test error");
        assert.strictEqual(logRecords[0].severityNumber, SeverityNumber.ERROR);
        assert.strictEqual(logRecords[0].attributes["test"], "testValue");
        assert.strictEqual(logRecords[0].attributes["test1"], "testValue1");
    });

    it("should serialize errors in log meta data", () => {
        let autoCollect = new AutoCollectLogs();
        autoCollect.enable({
            winston: { enabled: true }
        });
        const testError = new Error("test error");
        const errorEvent: winston.IWinstonData = {
            message: "test error",
            meta: { error: testError },
            level: "error",
            levelKind: "npm",
        };
        channel.publish("winston", errorEvent);
        const logRecords = memoryLogExporter.getFinishedLogRecords();
        assert.strictEqual(logRecords.length, 1);
        assert.strictEqual(logRecords[0].body, "test error");
        assert.strictEqual(logRecords[0].severityNumber, SeverityNumber.ERROR);
        assert.ok((logRecords[0].attributes["error"] as string).includes("Error: test error"));
    });

    it("should emit log for winston log", () => {
        let autoCollect = new AutoCollectLogs();
        autoCollect.enable({
            winston: { enabled: true }
        });
        const logEvent: winston.IWinstonData = {
            message: "test log",
            meta: { "test1": "testValue" },
            level: "debug",
            levelKind: "npm",
        };
        channel.publish("winston", logEvent);
        const logRecords = memoryLogExporter.getFinishedLogRecords();
        assert.strictEqual(logRecords.length, 1);
        assert.strictEqual(logRecords[0].body, "test log");
        assert.strictEqual(logRecords[0].severityNumber, SeverityNumber.DEBUG);
        assert.strictEqual(logRecords[0].attributes["test1"], "testValue");
    });

    it("severityLevel", () => {
        let autoCollect = new AutoCollectLogs();
        autoCollect.enable({
            console: { enabled: true, logSendingLevel: SeverityNumber.ERROR }
        });
        const logEvent: winston.IWinstonData = {
            message: "test log",
            meta: {},
            level: "debug",
            levelKind: "npm",
        };
        channel.publish("winston", logEvent);
        const logRecords = memoryLogExporter.getFinishedLogRecords();
        assert.strictEqual(logRecords.length, 0);
    });
});
