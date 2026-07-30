// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import assert from "assert";
import sinon from "sinon";
import { SeverityNumber, logs } from "@opentelemetry/api-logs";
import { InMemoryLogRecordExporter, LoggerProvider, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import * as distro from "@azure/monitor-opentelemetry";

import { shutdownAzureMonitor, useAzureMonitor } from "../../../src";

const connectionString = "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";

/** Console config as the distro receives it. `logSeverity` is typed by the distro in 1.20.0+. */
type ForwardedConsoleConfig = { enabled?: boolean; logSeverity?: SeverityNumber };

function forwardedConsoleConfig(distroStub: sinon.SinonStub): ForwardedConsoleConfig {
    return distroStub.args[0][0].instrumentationOptions.console as ForwardedConsoleConfig;
}

describe("AutoCollection/Console", () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(async () => {
        sandbox.restore();
        await shutdownAzureMonitor();
        delete process.env.APPLICATIONINSIGHTS_INSTRUMENTATION_LOGGING_LEVEL;
    });

    describe("#distro configuration", () => {
        it("should forward the console instrumentation setting to the distro", () => {
            const distroStub = sandbox.stub(distro, "useAzureMonitor");
            useAzureMonitor({
                azureMonitorExporterOptions: { connectionString },
                instrumentationOptions: { console: { enabled: true } },
            });
            assert.ok(distroStub.calledOnce, "distro useAzureMonitor should be called");
            assert.deepStrictEqual(
                forwardedConsoleConfig(distroStub),
                { enabled: true, logSeverity: undefined }
            );
        });

        it("should disable console collection by default", () => {
            const distroStub = sandbox.stub(distro, "useAzureMonitor");
            useAzureMonitor({ azureMonitorExporterOptions: { connectionString } });
            assert.strictEqual(
                forwardedConsoleConfig(distroStub).enabled,
                false
            );
        });

        it("should forward logSendingLevel to the distro as logSeverity", () => {
            const distroStub = sandbox.stub(distro, "useAzureMonitor");
            useAzureMonitor({
                azureMonitorExporterOptions: { connectionString },
                instrumentationOptions: {
                    console: { enabled: true, logSendingLevel: SeverityNumber.ERROR },
                },
            });
            assert.strictEqual(
                forwardedConsoleConfig(distroStub).logSeverity,
                SeverityNumber.ERROR
            );
        });

        it("should forward the log level env var to the distro as logSeverity", () => {
            process.env.APPLICATIONINSIGHTS_INSTRUMENTATION_LOGGING_LEVEL = "WARN";
            const distroStub = sandbox.stub(distro, "useAzureMonitor");
            useAzureMonitor({
                azureMonitorExporterOptions: { connectionString },
                instrumentationOptions: { console: { enabled: true } },
            });
            assert.strictEqual(
                forwardedConsoleConfig(distroStub).logSeverity,
                SeverityNumber.WARN
            );
        });

        it("should prefer an explicit logSendingLevel over the log level env var", () => {
            process.env.APPLICATIONINSIGHTS_INSTRUMENTATION_LOGGING_LEVEL = "WARN";
            const distroStub = sandbox.stub(distro, "useAzureMonitor");
            useAzureMonitor({
                azureMonitorExporterOptions: { connectionString },
                instrumentationOptions: {
                    console: { enabled: true, logSendingLevel: SeverityNumber.ERROR },
                },
            });
            assert.strictEqual(
                forwardedConsoleConfig(distroStub).logSeverity,
                SeverityNumber.ERROR
            );
        });
    });

    describe("#console collection", () => {
        it("should emit a log record for console output", async () => {
            const memoryLogExporter = new InMemoryLogRecordExporter();
            useAzureMonitor({
                azureMonitorExporterOptions: { connectionString },
                logRecordProcessors: [new SimpleLogRecordProcessor({ exporter: memoryLogExporter })],
                instrumentationOptions: { console: { enabled: true } },
            });
            console.error("Error: test error");
            await (logs.getLoggerProvider() as LoggerProvider).forceFlush();
            const logRecords = memoryLogExporter.getFinishedLogRecords();
            const record = logRecords.find((logRecord) => logRecord.body === "Error: test error");
            assert.ok(record, "Console log record should be emitted");
            assert.strictEqual(record.severityNumber, SeverityNumber.ERROR);
        });

        it("should patch console when enabled and restore it on shutdown", async () => {
            const originalLog = console.log;
            const originalError = console.error;
            useAzureMonitor({
                azureMonitorExporterOptions: { connectionString },
                instrumentationOptions: { console: { enabled: true } },
            });
            assert.notStrictEqual(console.log, originalLog, "console.log should be patched while enabled");
            await shutdownAzureMonitor();
            assert.strictEqual(console.log, originalLog, "console.log should be restored after shutdown");
            assert.strictEqual(console.error, originalError, "console.error should be restored after shutdown");
        });

        it("should not patch console when disabled", () => {
            const originalLog = console.log;
            useAzureMonitor({ azureMonitorExporterOptions: { connectionString } });
            assert.strictEqual(console.log, originalLog, "console.log should not be patched when disabled");
        });
    });
});
