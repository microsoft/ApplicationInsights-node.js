// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { context, trace } from "@opentelemetry/api";
import { IdGenerator, RandomIdGenerator } from "@opentelemetry/sdk-trace-base";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

import { BatchProcessor } from "./exporters/batchProcessor";
import { LogExporter } from "./exporters";
import * as Contracts from "../declarations/contracts";
import { AutoCollectConsole } from "./console";
import { AutoCollectExceptions } from "./exceptions";
import { ApplicationInsightsConfig } from "../shared/configuration";
import { Util } from "../shared/util";
import { ResourceManager } from "../shared/resourceManager";
import { Statsbeat } from "../metrics/statsbeat";
import { parseStack } from "./exporters/exceptionUtils";
import {
    AvailabilityData,
    TelemetryExceptionData,
    MessageData,
    MonitorDomain,
    PageViewData,
    TelemetryItem as Envelope,
    TelemetryExceptionDetails,
    KnownSeverityLevel,
    TelemetryEventData,
    KnownContextTagKeys,
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
import { IStandardMetricBaseDimensions, IMetricTraceDimensions } from "../metrics/types";
import { MetricHandler } from "../metrics/metricHandler";

export class LogHandler {
    // Statsbeat is instantiated here such that it can be accessed by the diagnostic-channel.
    public statsbeat: Statsbeat;
    private _config: ApplicationInsightsConfig;
    private _batchProcessor: BatchProcessor;
    private _exporter: LogExporter;
    private _console: AutoCollectConsole;
    private _exceptions: AutoCollectExceptions;
    private _idGenerator: IdGenerator;
    private _metricHandler: MetricHandler;

    constructor(config: ApplicationInsightsConfig, metricHandler?: MetricHandler, statsbeat?: Statsbeat) {
        this._config = config;
        this.statsbeat = statsbeat;
        this._exporter = new LogExporter(this._config, this.statsbeat);
        this._batchProcessor = new BatchProcessor(this._exporter);
        this._console = new AutoCollectConsole(this);
        this._exceptions = new AutoCollectExceptions(this);
        this._idGenerator = new RandomIdGenerator();
        this._metricHandler = metricHandler;
    }

    public start() {
        this._console.enable(this._config.logInstrumentations);
        this._exceptions.enable(this._config.enableAutoCollectExceptions);
    }

    public async flush(): Promise<void> {
        await this._batchProcessor.triggerSend();
    }

    public async shutdown(): Promise<void> {
        this._console.shutdown();
        this._console = null;
        this._exceptions.enable(false);
        this._exceptions = null;
    }

    /**
     * Log information about availability of an application
     * @param telemetry      Object encapsulating tracking options
     */
    public async trackAvailability(telemetry: Contracts.AvailabilityTelemetry): Promise<void> {
        try {
            const envelope = this._availabilityToEnvelope(
                telemetry,
                this._config.getInstrumentationKey()
            );
            this._batchProcessor.send(envelope);
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
            const envelope = this._pageViewToEnvelope(
                telemetry,
                this._config.getInstrumentationKey()
            );
            this._batchProcessor.send(envelope);
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
            const envelope = this._traceToEnvelope(telemetry, this._config.getInstrumentationKey());
            if (this._metricHandler?.getConfig().enableAutoCollectStandardMetrics) {
                const baseData = envelope.data.baseData as MessageData;
                const traceDimensions: IMetricTraceDimensions = {
                    cloudRoleInstance: envelope.tags[KnownContextTagKeys.AiCloudRoleInstance],
                    cloudRoleName: envelope.tags[KnownContextTagKeys.AiCloudRole],
                    traceSeverityLevel: baseData.severity
                };
                this._metricHandler.recordTrace(traceDimensions);
                // Mark envelope as processed
                const traceData: TraceTelemetry = (envelope.data as any).baseData;
                traceData.properties = {
                    ...traceData.properties,
                    "_MS.ProcessedByMetricExtractors": "(Name:'Traces', Ver:'1.1')",
                };
            }
            this._batchProcessor.send(envelope);
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
            const envelope = this._exceptionToEnvelope(
                telemetry,
                this._config.getInstrumentationKey()
            );
            if (this._metricHandler?.getConfig().enableAutoCollectStandardMetrics) {
                const exceptionDimensions: IStandardMetricBaseDimensions = {
                    cloudRoleInstance: envelope.tags[KnownContextTagKeys.AiCloudRoleInstance],
                    cloudRoleName: envelope.tags[KnownContextTagKeys.AiCloudRole]
                };
                this._metricHandler.recordException(exceptionDimensions);
                // Mark envelope as processed
                const exceptionData: TelemetryExceptionData = (envelope.data as any).baseData;
                exceptionData.properties = {
                    ...exceptionData.properties,
                    "_MS.ProcessedByMetricExtractors": "(Name:'Exceptions', Ver:'1.1')",
                };
            }
            this._batchProcessor.send(envelope);
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
            const envelope = this._eventToEnvelope(telemetry, this._config.getInstrumentationKey());
            this._batchProcessor.send(envelope);
        } catch (err) {
            Logger.getInstance().error("Failed to send telemetry.", err);
        }
    }

    private _logToEnvelope(
        telemetry: Telemetry,
        baseType: string,
        baseData: MonitorDomain,
        instrumentationKey: string
    ): Envelope {
        const version = 1;
        const name = `Microsoft.ApplicationInsights.${instrumentationKey.replace(
            /-/g,
            ""
        )}.${baseType.substring(0, baseType.length - 4)}`;
        const sampleRate = 100; // TODO: Log sampling not supported yet
        let properties = {};
        if (telemetry.properties) {
            // sanitize properties
            properties = Util.getInstance().validateStringMap(telemetry.properties);
        }
        const tags = this._getTags();
        const envelope: Envelope = {
            name: name,
            time: telemetry.time || new Date(),
            instrumentationKey: instrumentationKey,
            version: version,
            sampleRate: sampleRate,
            data: {
                baseType,
                baseData: {
                    ...baseData,
                    properties,
                },
            },
            tags: tags,
        };
        return envelope;
    }

    /**
     * Availability Log to Azure envelope parsing.
     * @internal
     */
    private _availabilityToEnvelope(
        telemetry: AvailabilityTelemetry,
        instrumentationKey: string
    ): Envelope {
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
        const envelope = this._logToEnvelope(telemetry, baseType, baseData, instrumentationKey);
        return envelope;
    }

    /**
     * Exception to Azure envelope parsing.
     * @internal
     */
    private _exceptionToEnvelope(
        telemetry: ExceptionTelemetry,
        instrumentationKey: string
    ): Envelope {
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
        const envelope = this._logToEnvelope(telemetry, baseType, baseData, instrumentationKey);
        return envelope;
    }

    /**
     * Trace to Azure envelope parsing.
     * @internal
     */
    private _traceToEnvelope(telemetry: TraceTelemetry, instrumentationKey: string): Envelope {
        const baseType = "MessageData";
        const baseData: MessageData = {
            message: telemetry.message,
            severityLevel: telemetry.severity || KnownSeverityLevel.Information,
            measurements: telemetry.measurements,
            version: 2,
        };
        const envelope = this._logToEnvelope(telemetry, baseType, baseData, instrumentationKey);
        return envelope;
    }

    /**
     * PageView to Azure envelope parsing.
     * @internal
     */
    private _pageViewToEnvelope(
        telemetry: PageViewTelemetry,
        instrumentationKey: string
    ): Envelope {
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

        const envelope = this._logToEnvelope(telemetry, baseType, baseData, instrumentationKey);
        return envelope;
    }

    /**
     * Event to Azure envelope parsing.
     * @internal
     */
    private _eventToEnvelope(telemetry: EventTelemetry, instrumentationKey: string): Envelope {
        const baseType = "EventData";
        const baseData: TelemetryEventData = {
            name: telemetry.name,
            measurements: telemetry.measurements,
            version: 2,
        };
        const envelope = this._logToEnvelope(telemetry, baseType, baseData, instrumentationKey);
        return envelope;
    }

    private _getTags() {
        const tags = <{ [key: string]: string }>{};
        const attributes = ResourceManager.getInstance().getLogResource().attributes;
        const serviceName = attributes[SemanticResourceAttributes.SERVICE_NAME];
        const serviceNamespace = attributes[SemanticResourceAttributes.SERVICE_NAMESPACE];
        if (serviceName) {
            if (serviceNamespace) {
                tags[KnownContextTagKeys.AiCloudRole] = `${serviceNamespace}.${serviceName}`;
            } else {
                tags[KnownContextTagKeys.AiCloudRole] = String(serviceName);
            }
        }
        const serviceInstanceId = attributes[SemanticResourceAttributes.SERVICE_INSTANCE_ID];
        tags[KnownContextTagKeys.AiCloudRoleInstance] = String(serviceInstanceId);
        tags[KnownContextTagKeys.AiInternalSdkVersion] = String(
            attributes[SemanticResourceAttributes.TELEMETRY_SDK_VERSION]
        );

        // Add Correlation headers
        const spanContext = trace.getSpanContext(context.active());
        if (spanContext) {
            tags[KnownContextTagKeys.AiOperationId] = spanContext.traceId;
            tags[KnownContextTagKeys.AiOperationParentId] = spanContext.spanId;
        } else {
            tags[KnownContextTagKeys.AiOperationId] = this._idGenerator.generateTraceId();
        }
        return tags;
    }
}
