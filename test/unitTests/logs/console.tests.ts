// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import assert from "assert";
import { SeverityNumber, logs } from '@opentelemetry/api-logs';
import {
    LoggerProvider,
    SimpleLogRecordProcessor,
    InMemoryLogRecordExporter,
} from '@opentelemetry/sdk-logs';

import { AutoCollectLogs } from "../../../src/logs/autoCollectLogs";


describe("AutoCollection/Console", () => {
    let memoryLogExporter: InMemoryLogRecordExporter;
    let autoCollect: AutoCollectLogs;

    before(() => {
        logs.disable();
        memoryLogExporter = new InMemoryLogRecordExporter();
        const loggerProvider = new LoggerProvider({
            processors: [new SimpleLogRecordProcessor(memoryLogExporter)],
        });
        logs.setGlobalLoggerProvider(loggerProvider);
    });

    beforeEach(() => {
        memoryLogExporter.getFinishedLogRecords().length = 0; // clear
    });

    afterEach(() => {
        autoCollect?.shutdown();
    });

    describe("#log and #error()", () => {
        it("should log event for errors", () => {
            autoCollect = new AutoCollectLogs();
            autoCollect.enable({
                console: { enabled: true }
            });
            console.error("Error: test error");
            const logRecords = memoryLogExporter.getFinishedLogRecords();
            assert.strictEqual(logRecords.length, 1);
            assert.strictEqual(logRecords[0].body, "Error: test error");
            assert.strictEqual(logRecords[0].severityNumber, SeverityNumber.ERROR);
        });

        it("should log event for logs", () => {
            autoCollect = new AutoCollectLogs();
            autoCollect.enable({
                console: { enabled: true }
            });
            console.warn("test log");
            const logRecords = memoryLogExporter.getFinishedLogRecords();
            assert.strictEqual(logRecords.length, 1);
            assert.strictEqual(logRecords[0].body, "test log");
            assert.strictEqual(logRecords[0].severityNumber, SeverityNumber.WARN);
        });

        it("severityLevel", () => {
            autoCollect = new AutoCollectLogs();
            autoCollect.enable({
                console: { enabled: true, logSendingLevel: SeverityNumber.ERROR }
            });
            console.warn("test log");
            const logRecords = memoryLogExporter.getFinishedLogRecords();
            assert.strictEqual(logRecords.length, 0);
        });

        it("should restore original console methods on shutdown", () => {
            const originalLog = console.log;
            const originalError = console.error;
            autoCollect = new AutoCollectLogs();
            autoCollect.enable({
                console: { enabled: true }
            });
            assert.notStrictEqual(console.log, originalLog, "console.log should be patched while enabled");
            autoCollect.shutdown();
            assert.strictEqual(console.log, originalLog, "console.log should be restored after shutdown");
            assert.strictEqual(console.error, originalError, "console.error should be restored after shutdown");
        });
    });
});
