// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import assert from "assert";
import { channel } from "diagnostic-channel";
import { console } from "diagnostic-channel-publishers";
import { SeverityNumber, logs } from '@opentelemetry/api-logs';
import {
    LoggerProvider,
    SimpleLogRecordProcessor,
    InMemoryLogRecordExporter,
} from '@opentelemetry/sdk-logs';

import { dispose } from "../../../src/logs/diagnostic-channel/console.sub";
import { AutoCollectLogs } from "../../../src/logs/autoCollectLogs";


describe("AutoCollection/Console", () => {
    let memoryLogExporter: InMemoryLogRecordExporter;

    before(() => {
        logs.disable();
        memoryLogExporter = new InMemoryLogRecordExporter();
        const loggerProvider = new LoggerProvider();
        loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(memoryLogExporter));
        logs.setGlobalLoggerProvider(loggerProvider);
    });

    beforeEach(() => {
        memoryLogExporter.getFinishedLogRecords().length = 0; // clear
    });

    afterEach(() => {
        dispose();
    });

    describe("#log and #error()", () => {
        it("should log event for errors", () => {
            let autoCollect = new AutoCollectLogs();
            autoCollect.enable({
                console: { enabled: true }
            });
            const dummyError = new Error("test error");
            const errorEvent: console.IConsoleData = {
                message: dummyError.toString(),
                stderr: false,
            };
            channel.publish("console", errorEvent);
            const logRecords = memoryLogExporter.getFinishedLogRecords();
            assert.strictEqual(logRecords.length, 1);
            assert.strictEqual(logRecords[0].body, "Error: test error");
            assert.strictEqual(logRecords[0].severityNumber, SeverityNumber.ERROR);
        });

        it("should log event for logs", () => {
            let autoCollect = new AutoCollectLogs();
            autoCollect.enable({
                console: { enabled: true }
            });
            const logEvent: console.IConsoleData = {
                message: "test log",
                stderr: true,
            };
            channel.publish("console", logEvent);
            const logRecords = memoryLogExporter.getFinishedLogRecords();
            assert.strictEqual(logRecords.length, 1);
            assert.strictEqual(logRecords[0].body, "test log");
            assert.strictEqual(logRecords[0].severityNumber, SeverityNumber.WARN);
        });

        it("severityLevel", () => {
            let autoCollect = new AutoCollectLogs();
            autoCollect.enable({
                console: { enabled: true, logSendingLevel: SeverityNumber.ERROR }
            });
            const logEvent: console.IConsoleData = {
                message: "test log",
                stderr: true,
            };
            channel.publish("console", logEvent);
            const logRecords = memoryLogExporter.getFinishedLogRecords();
            assert.strictEqual(logRecords.length, 0);
        });
    });
});
