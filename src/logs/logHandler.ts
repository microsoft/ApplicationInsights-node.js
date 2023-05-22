// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LogRecord, LoggerProvider, LoggerConfig, SimpleLogRecordProcessor, Logger as OtelLogger } from "@opentelemetry/sdk-logs";
import { LoggerProviderConfig } from "@opentelemetry/sdk-logs/build/src/types";
import { IdGenerator, RandomIdGenerator } from "@opentelemetry/sdk-trace-base";
import { AzureMonitorLogExporter } from "./logExporter";
import * as Contracts from "../declarations/contracts";
import { AutoCollectConsole } from "./console";
import { AutoCollectExceptions, parseStack } from "./exceptions";
import { ApplicationInsightsConfig } from "../shared/configuration";
import { Util } from "../shared/util";
import {
    AvailabilityData,
    TelemetryExceptionData,
    MessageData,
    MonitorDomain,
    PageViewData,
    TelemetryExceptionDetails,
    KnownSeverityLevel,
    TelemetryEventData,
} from "../declarations/generated";
import {
    AvailabilityTelemetry,
    TraceTelemetry,
    ExceptionTelemetry,
    EventTelemetry,
    PageViewTelemetry,
    Telemetry,
} from "../declarations/contracts";
import { Logger } from "../shared/logging";
import { MetricHandler } from "../metrics/metricHandler";


export class LogHandler {
    private _config: ApplicationInsightsConfig;
    private _metricHandler: MetricHandler;
    private _loggerProvider: LoggerProvider;
    private _logger: OtelLogger;
    private _exporter: AzureMonitorLogExporter;
    private _logRecordProcessor: SimpleLogRecordProcessor;
    private _console: AutoCollectConsole;
    private _exceptions: AutoCollectExceptions;
    private _idGenerator: IdGenerator;

    constructor(config: ApplicationInsightsConfig, metricHandler?: MetricHandler) {
        this._config = config;
        this._metricHandler = metricHandler;
        this._exporter = new AzureMonitorLogExporter(this._config);
        const loggerProviderConfig: LoggerProviderConfig = {
            resource: this._config.resource,
        };
        this._loggerProvider = new LoggerProvider(loggerProviderConfig);
        this._exporter = new AzureMonitorLogExporter(this._config.azureMonitorExporterConfig);
        this._logRecordProcessor = new SimpleLogRecordProcessor(this._exporter);
        this._loggerProvider.addLogRecordProcessor(this._logRecordProcessor);
        const loggerConfig: LoggerConfig = {
            includeTraceContext: true
        };
        this._logger = this._loggerProvider.getLogger("AzureMonitorLogger", undefined, loggerConfig) as OtelLogger;
        this._console = new AutoCollectConsole(this);
        if (this._config.enableAutoCollectExceptions) {
            this._exceptions = new AutoCollectExceptions(this);
        }
        this._idGenerator = new RandomIdGenerator();
        this._console.enable(this._config.logInstrumentations);
    }

    /**
 *Get OpenTelemetry LoggerProvider
 */
    public getLoggerProvider(): LoggerProvider {
        return this._loggerProvider;
    }

    /**
     *Get OpenTelemetry Logger
     */
    public getLogger(): OtelLogger {
        return this._logger;
    }

    /** 
  * @deprecated This should not be used
  */
    public start() {
        // No Op
    }

    public async flush(): Promise<void> {
        return this._loggerProvider.forceFlush();
    }

    public async shutdown(): Promise<void> {
        this._console.shutdown();
        this._console = null;
        this._exceptions?.shutdown();
        this._exceptions = null;
    }

    /**
     * Log information about availability of an application
     * @param telemetry      Object encapsulating tracking options
     */
    public async trackAvailability(telemetry: Contracts.AvailabilityTelemetry): Promise<void> {
        try {
            const logRecord = this._availabilityToEnvelope(
                telemetry
            );
            this._logger.emit(logRecord);
        } catch (err) {
            Logger.getInstance().error("Failed to send telemetry.", err);
        }
    }

    /**
     * Log a page view
     * @param telemetry      Object encapsulating tracking options
     */
    public async trackPageView(telemetry: Contracts.PageViewTelemetry): Promise<void> {
        try {
            const logRecord = this._pageViewToEnvelope(
                telemetry
            );
            this._logger.emit(logRecord);
        } catch (err) {
            Logger.getInstance().error("Failed to send telemetry.", err);
        }
    }

    /**
     * Log a trace message
     * @param telemetry      Object encapsulating tracking options
     */
    public async trackTrace(telemetry: Contracts.TraceTelemetry): Promise<void> {
        try {
            const logRecord = this._traceToEnvelope(telemetry);
            this._metricHandler?.recordLog(logRecord);
            this._logger.emit(logRecord);
        } catch (err) {
            Logger.getInstance().error("Failed to send telemetry.", err);
        }
    }

    /**
     * Log an exception
     * @param telemetry      Object encapsulating tracking options
     */
    public async trackException(telemetry: Contracts.ExceptionTelemetry): Promise<void> {
        if (telemetry && telemetry.exception && !Util.getInstance().isError(telemetry.exception)) {
            telemetry.exception = new Error(telemetry.exception.toString());
        }
        try {
            const logRecord = this._exceptionToEnvelope(
                telemetry
            );
            this._metricHandler?.recordLog(logRecord);
            this._logger.emit(logRecord);
        } catch (err) {
            Logger.getInstance().error("Failed to send telemetry.", err);
        }
    }

    /**
     * Log a user action or other occurrence.
     * @param telemetry      Object encapsulating tracking options
     */
    public async trackEvent(telemetry: Contracts.EventTelemetry): Promise<void> {
        try {
            const logRecord = this._eventToEnvelope(telemetry);
            this._logger.emit(logRecord);
        } catch (err) {
            Logger.getInstance().error("Failed to send telemetry.", err);
        }
    }

    private _telemetryToLogRecord(
        telemetry: Telemetry,
        baseType: string,
        baseData: MonitorDomain
    ): LogRecord {

        const record: LogRecord = new LogRecord(this._logger, {});
        // TODO: We need to define special contract between distro and exporter to support all type of telemetry
        return record;
    }

    /**
     * Availability Log to Azure envelope parsing.
     * @internal
     */
    private _availabilityToEnvelope(
        telemetry: AvailabilityTelemetry
    ): LogRecord {
        const baseType = "AvailabilityData";
        const baseData: AvailabilityData = {
            id: telemetry.id || this._idGenerator.generateSpanId(),
            name: telemetry.name,
            duration: Util.getInstance().msToTimeSpan(telemetry.duration),
            success: telemetry.success,
            runLocation: telemetry.runLocation,
            message: telemetry.message,
            measurements: telemetry.measurements,
            version: 2,
        };
        const record = this._telemetryToLogRecord(telemetry, baseType, baseData);
        return record;
    }

    /**
     * Exception to Azure envelope parsing.
     * @internal
     */
    private _exceptionToEnvelope(
        telemetry: ExceptionTelemetry
    ): LogRecord {
        const baseType = "ExceptionData";
        const stack = telemetry.exception["stack"];
        const parsedStack = parseStack(stack);
        const exceptionDetails: TelemetryExceptionDetails = {
            message: telemetry.exception.message,
            typeName: telemetry.exception.name,
            parsedStack: parsedStack,
            hasFullStack: Util.getInstance().isArray(parsedStack) && parsedStack.length > 0,
        };

        const baseData: TelemetryExceptionData = {
            severityLevel: telemetry.severity || KnownSeverityLevel.Error,
            exceptions: [exceptionDetails],
            measurements: telemetry.measurements,
            version: 2,
        };
        const record = this._telemetryToLogRecord(telemetry, baseType, baseData);
        return record;
    }

    /**
     * Trace to Azure envelope parsing.
     * @internal
     */
    private _traceToEnvelope(telemetry: TraceTelemetry): LogRecord {
        const baseType = "MessageData";
        const baseData: MessageData = {
            message: telemetry.message,
            severityLevel: telemetry.severity || KnownSeverityLevel.Information,
            measurements: telemetry.measurements,
            version: 2,
        };
        const record = this._telemetryToLogRecord(telemetry, baseType, baseData);
        return record;
    }

    /**
     * PageView to Azure envelope parsing.
     * @internal
     */
    private _pageViewToEnvelope(
        telemetry: PageViewTelemetry
    ): LogRecord {
        const baseType = "PageViewData";
        const baseData: PageViewData = {
            id: telemetry.id || this._idGenerator.generateSpanId(),
            name: telemetry.name,
            duration: Util.getInstance().msToTimeSpan(telemetry.duration),
            url: telemetry.url,
            referredUri: telemetry.referredUri,
            measurements: telemetry.measurements,
            version: 2,
        };

        const record = this._telemetryToLogRecord(telemetry, baseType, baseData);
        return record;
    }

    /**
     * Event to Azure envelope parsing.
     * @internal
     */
    private _eventToEnvelope(telemetry: EventTelemetry): LogRecord {
        const baseType = "EventData";
        const baseData: TelemetryEventData = {
            name: telemetry.name,
            measurements: telemetry.measurements,
            version: 2,
        };
        const record = this._telemetryToLogRecord(telemetry, baseType, baseData);
        return record;
    }
}
