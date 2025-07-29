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

    describe("module resolution", () => {
        it("should handle both enable() and shutdown() without throwing errors", () => {
            // Test that the module resolution works correctly
            let autoCollect = new AutoCollectLogs();
            
            // These should work without throwing any module resolution errors
            assert.doesNotThrow(() => {
                autoCollect.enable({
                    console: { enabled: true }
                });
            }, "enable() should not throw module resolution errors");
            
            assert.doesNotThrow(() => {
                autoCollect.shutdown();
            }, "shutdown() should not throw module resolution errors");
        });

        it("should load console module correctly and capture events", () => {
            // This test ensures that the module resolution works correctly
            // and that console events are being captured
            let autoCollect = new AutoCollectLogs();
            
            // Enable should work and load the module correctly
            autoCollect.enable({
                console: { enabled: true }
            });
            
            // Verify that console events are being captured (proving the module loaded correctly)
            const dummyError = new Error("test module resolution");
            const errorEvent: console.IConsoleData = {
                message: dummyError.toString(),
                stderr: false,
            };
            channel.publish("console", errorEvent);
            
            const logRecords = memoryLogExporter.getFinishedLogRecords();
            assert.strictEqual(logRecords.length, 1);
            assert.strictEqual(logRecords[0].body, "Error: test module resolution");
            
            // Shutdown should also work correctly
            autoCollect.shutdown();
        });
    });
});
