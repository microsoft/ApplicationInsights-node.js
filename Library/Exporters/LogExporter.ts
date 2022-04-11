// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { diag } from "@opentelemetry/api";
import { ExportResult } from "@opentelemetry/core";
import { AzureExporterConfig } from "@azure/monitor-opentelemetry-exporter";

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
} from "../../Declarations/Generated";
import { AvailabilityTelemetry, TraceTelemetry, ExceptionTelemetry, EventTelemetry, PageViewTelemetry, Telemetry } from "../../Declarations/Contracts";
import { BaseExporter } from "./Shared/BaseExporter";
import { parseStack } from "./Shared/ExceptionUtils";
import { Config } from "../Configuration/Config";
import { Context } from "../Context";
import { Util } from "../Util/Util";

export class LogExporter extends BaseExporter {

    private _config: Config;
    private _clientContext: Context;

    constructor(config: Config, context: Context) {
        let ingestionEndpoint = config.endpointUrl.replace("/v2.1/track", "");
        let connectionString = `InstrumentationKey=${config.instrumentationKey};IngestionEndpoint=${ingestionEndpoint}`;
        let exporterConfig: AzureExporterConfig = {
            connectionString: connectionString
        };
        super(exporterConfig);
        this._config = config;
        this._clientContext = context;
    }

    public async exportAvailability(logs: AvailabilityTelemetry[], resultCallback: (result: ExportResult) => void): Promise<void> {
        diag.info(`Exporting ${logs.length} log(s). Converting to envelopes...`);
        const envelopes = logs.map((log) =>
            this._availabilityToEnvelope(log, this._options.instrumentationKey)
        );
        resultCallback(await this._exportEnvelopes(envelopes));
    }

    public async exportTrace(logs: TraceTelemetry[], resultCallback: (result: ExportResult) => void): Promise<void> {
        diag.info(`Exporting ${logs.length} logs(s). Converting to envelopes...`);
        const envelopes = logs.map((log) =>
            this._traceToEnvelope(log, this._options.instrumentationKey)
        );
        resultCallback(await this._exportEnvelopes(envelopes));
    }

    public async exportException(logs: ExceptionTelemetry[], resultCallback: (result: ExportResult) => void): Promise<void> {
        diag.info(`Exporting ${logs.length} log(s). Converting to envelopes...`);
        const envelopes = logs.map((log) =>
            this._exceptionToEnvelope(log, this._options.instrumentationKey)
        );
        resultCallback(await this._exportEnvelopes(envelopes));
    }

    public async exportEvent(logs: EventTelemetry[], resultCallback: (result: ExportResult) => void): Promise<void> {
        diag.info(`Exporting ${logs.length} log(s). Converting to envelopes...`);
        const envelopes = logs.map((log) =>
            this._eventToEnvelope(log, this._options.instrumentationKey)
        );
        resultCallback(await this._exportEnvelopes(envelopes));
    }

    public async exportPageView(logs: PageViewTelemetry[], resultCallback: (result: ExportResult) => void): Promise<void> {
        diag.info(`Exporting ${logs.length} log(s). Converting to envelopes...`);
        const envelopes = logs.map((log) =>
            this._pageViewToEnvelope(log, this._options.instrumentationKey)
        );
        resultCallback(await this._exportEnvelopes(envelopes));
    }

    /**
    * Shutdown AzureMonitorTraceExporter.
    */
    async shutdown(): Promise<void> {
        diag.info("Azure Monitor Logs Exporter shutting down");
        return this._sender.shutdown();
    }

    private _logToEnvelope(telemetry: Telemetry, baseType: string, baseData: MonitorDomain, instrumentationKey: string): Envelope {
        let version = 1;
        let name =
            "Microsoft.ApplicationInsights." +
            instrumentationKey.replace(/-/g, "") +
            "." +
            baseType.substring(0, baseType.length - 4);
        let sampleRate = this._config.samplingPercentage;
        let properties = {};
        if (telemetry.properties) {
            // sanitize properties
            properties = Util.getInstance().validateStringMap(telemetry.properties);
        }
        const tags = this._getTags(this._clientContext);
        let envelope: Envelope = {
            name: name,
            time: telemetry.time || (new Date()),
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
            tags: tags
        };
        return envelope;
    }



    /**
     * Availability Log to Azure envelope parsing.
     * @internal
     */
    private _availabilityToEnvelope(telemetry: AvailabilityTelemetry, instrumentationKey: string): Envelope {
        let baseType: "AvailabilityData";
        let baseData: AvailabilityData = {
            id: telemetry.id,
            name: telemetry.name,
            duration: telemetry.duration.toString(),
            success: telemetry.success,
            runLocation: telemetry.runLocation,
            message: telemetry.message,
            measurements: telemetry.measurements
        };
        let envelope = this._logToEnvelope(telemetry, baseType, baseData, instrumentationKey);
        return envelope;
    }

    /**
     * Exception to Azure envelope parsing.
     * @internal
     */
    private _exceptionToEnvelope(telemetry: ExceptionTelemetry, instrumentationKey: string): Envelope {
        let baseType: "ExceptionData";
        var stack = telemetry.exception["stack"];
        let parsedStack = parseStack(stack);
        let exceptionDetails: TelemetryExceptionDetails = {
            message: telemetry.exception.message,
            typeName: telemetry.exception.name,
            parsedStack: parsedStack,
            hasFullStack: Util.getInstance().isArray(parsedStack) && parsedStack.length > 0
        };

        let baseData: TelemetryExceptionData = {
            severityLevel: telemetry.severity || KnownSeverityLevel.Error,
            exceptions: [exceptionDetails],
            measurements: telemetry.measurements
        };
        let envelope = this._logToEnvelope(telemetry, baseType, baseData, instrumentationKey);
        return envelope;
    }

    /**
     * Trace to Azure envelope parsing.
     * @internal
     */
    private _traceToEnvelope(telemetry: TraceTelemetry, instrumentationKey: string): Envelope {
        let baseType: "MessageData";
        let baseData: MessageData = {
            message: telemetry.message,
            severityLevel: telemetry.severity || KnownSeverityLevel.Information,
            measurements: telemetry.measurements
        };
        let envelope = this._logToEnvelope(telemetry, baseType, baseData, instrumentationKey);
        return envelope;
    }

    /**
     * PageView to Azure envelope parsing.
     * @internal
     */
    private _pageViewToEnvelope(telemetry: PageViewTelemetry, instrumentationKey: string): Envelope {
        let baseType: "PageViewData";
        let baseData: PageViewData = {
            id: telemetry.id,
            name: telemetry.name,
            duration: Util.getInstance().msToTimeSpan(telemetry.duration),
            url: telemetry.url,
            referredUri: telemetry.referredUri,
            measurements: telemetry.measurements
        };

        let envelope = this._logToEnvelope(telemetry, baseType, baseData, instrumentationKey);
        return envelope;
    }

    /**
     * Event to Azure envelope parsing.
     * @internal
     */
    private _eventToEnvelope(telemetry: EventTelemetry, instrumentationKey: string): Envelope {
        let baseType: "EventData";
        let baseData: TelemetryEventData = {
            name: telemetry.name,
            measurements: telemetry.measurements
        };
        let envelope = this._logToEnvelope(telemetry, baseType, baseData, instrumentationKey);
        return envelope;
    }

    private _getTags(context: Context) {
        // Make a copy of context tags so we don't alter the actual object
        // Also perform tag overriding
        var newTags = <{ [key: string]: string }>{};
        if (context && context.tags) {
            for (var key in context.tags) {
                newTags[key] = context.tags[key];
            }
        }
        return newTags;
    }
}
