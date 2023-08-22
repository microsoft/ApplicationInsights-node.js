// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Logger as OtelLogger, LogRecord, logs } from "@opentelemetry/api-logs";
import { LogRecord as SDKLogRecord } from "@opentelemetry/sdk-logs";
import { Attributes } from "@opentelemetry/api";
import { IdGenerator, RandomIdGenerator } from "@opentelemetry/sdk-trace-base";

import * as Contracts from "../declarations/contracts";
import {
    AvailabilityData,
    KnownSeverityLevel,
    MessageData,
    MonitorDomain,
    PageViewData,
    TelemetryEventData,
    TelemetryExceptionData,
    TelemetryExceptionDetails
} from "../declarations/generated";
import { Logger } from "../shared/logging";
import { Util } from "../shared/util";
import { parseStack } from "./exceptions";

/**
 * Log manual API to generate Application Insights telemetry
 */
export class LogApi {
    private _idGenerator: IdGenerator;
    private _logger: OtelLogger;

    /**
    * Constructs a new client of LogApi
    */
    constructor(logger: OtelLogger) {
        this._idGenerator = new RandomIdGenerator();
        this._logger = logger;
    }

    /**
       * Log information about availability of an application
       * @param telemetry      Object encapsulating tracking options
       */
    public trackAvailability(telemetry: Contracts.AvailabilityTelemetry): void {
        try {
            const logRecord = this._availabilityToLogRecord(
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
    public trackPageView(telemetry: Contracts.PageViewTelemetry): void {
        try {
            const logRecord = this._pageViewToLogRecord(
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
    public trackTrace(telemetry: Contracts.TraceTelemetry): void {
        try {
            const logRecord = this._traceToLogRecord(telemetry) as SDKLogRecord;
            this._logger.emit(logRecord);
        } catch (err) {
            Logger.getInstance().error("Failed to send telemetry.", err);
        }
    }

    /**
     * Log an exception
     * @param telemetry      Object encapsulating tracking options
     */
    public trackException(telemetry: Contracts.ExceptionTelemetry): void {
        if (telemetry && telemetry.exception && !Util.getInstance().isError(telemetry.exception)) {
            telemetry.exception = new Error(telemetry.exception.toString());
        }
        try {
            const logRecord = this._exceptionToLogRecord(
                telemetry
            ) as SDKLogRecord;
            this._logger.emit(logRecord);
        } catch (err) {
            Logger.getInstance().error("Failed to send telemetry.", err);
        }
    }

    /**
     * Log a user action or other occurrence.
     * @param telemetry      Object encapsulating tracking options
     */
    public trackEvent(telemetry: Contracts.EventTelemetry): void {
        try {
            const logRecord = this._eventToLogRecord(telemetry);
            this._logger.emit(logRecord);
        } catch (err) {
            Logger.getInstance().error("Failed to send telemetry.", err);
        }
    }

    private _telemetryToLogRecord(
        telemetry: Contracts.Telemetry,
        baseType: string,
        baseData: MonitorDomain
    ): LogRecord {
        try {
            const attributes: Attributes = {
                ...telemetry.properties,
            };
            const record: LogRecord = { attributes: attributes, body: Util.getInstance().stringify(baseData) };
            record.attributes["_MS.baseType"] = baseType;
            return record;
        }
        catch (err) {
            Logger.getInstance().warn("Failed to convert telemetry event to Log Record.", err);
        }
    }

    /**
    * Availability Log to LogRecord parsing.
    * @internal
    */
    private _availabilityToLogRecord(
        telemetry: Contracts.AvailabilityTelemetry
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
     * Exception to LogRecord parsing.
     * @internal
     */
    private _exceptionToLogRecord(
        telemetry: Contracts.ExceptionTelemetry
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
     * Trace to LogRecord parsing.
     * @internal
     */
    private _traceToLogRecord(telemetry: Contracts.TraceTelemetry): LogRecord {
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
     * PageView to LogRecord parsing.
     * @internal
     */
    private _pageViewToLogRecord(
        telemetry: Contracts.PageViewTelemetry
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
     * Event to LogRecord parsing.
     * @internal
     */
    private _eventToLogRecord(telemetry: Contracts.EventTelemetry): LogRecord {
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
