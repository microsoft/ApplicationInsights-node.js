// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Attributes, context, metrics, ProxyTracerProvider, SpanKind, SpanOptions, SpanStatusCode, diag, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { LoggerProvider } from "@opentelemetry/sdk-logs";
import { 
    SEMATTRS_DB_STATEMENT,
    SEMATTRS_DB_SYSTEM,
    SEMATTRS_HTTP_METHOD,
    SEMATTRS_HTTP_STATUS_CODE,
    SEMATTRS_HTTP_URL,
    SEMATTRS_PEER_SERVICE,
    SEMATTRS_RPC_GRPC_STATUS_CODE,
    SEMATTRS_RPC_METHOD,
    SEMATTRS_RPC_SYSTEM
} from "@opentelemetry/semantic-conventions";
import * as Contracts from "../declarations/contracts";
import { TelemetryItem as Envelope } from "../declarations/generated";
import { Context } from "./context";
import { Util } from "../shared/util";
import Config = require("./shim-config");
import { AttributeSpanProcessor } from "../shared/util/attributeSpanProcessor";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { AttributeLogProcessor } from "../shared/util/attributeLogRecordProcessor";
import { LogApi } from "./logsApi";
import { flushAzureMonitor, shutdownAzureMonitor, useAzureMonitor } from "../main";
import { AzureMonitorOpenTelemetryOptions } from "../types";
import { UNSUPPORTED_MSG } from "./types";

/**
 * Application Insights telemetry client provides interface to track telemetry items, register telemetry initializers and
 * and manually trigger immediate sending (flushing)
 */
export class TelemetryClient {
    public context: Context;
    public commonProperties: { [key: string]: string };
    public config: Config;
    private _attributeSpanProcessor: AttributeSpanProcessor;
    private _attributeLogProcessor: AttributeLogProcessor;
    private _logApi: LogApi;
    private _isInitialized: boolean;
    private _options: AzureMonitorOpenTelemetryOptions;
    private _configWarnings: string[] = [];

    /**
     * Constructs a new instance of TelemetryClient
     * @param setupString the Connection String or Instrumentation Key to use (read from environment variable if not specified)
     */
    constructor(input?: string) {
        const config = new Config(input, this._configWarnings);
        this.config = config;
        this.commonProperties = {};
        this.context = new Context();
        this._isInitialized = false;
    }

    public initialize() {
        this._isInitialized = true;
        // Parse shim config to Azure Monitor options
        this._options = this.config.parseConfig();
        useAzureMonitor(this._options);
        try {
            // LoggerProvider would be initialized when client is instantiated
            // Get Logger from global provider
            this._logApi = new LogApi(logs.getLogger("ApplicationInsightsLogger"));
            this._attributeSpanProcessor = new AttributeSpanProcessor({ ...this.context.tags, ...this.commonProperties });
            ((trace.getTracerProvider() as ProxyTracerProvider).getDelegate() as NodeTracerProvider).addSpanProcessor(this._attributeSpanProcessor);

            this._attributeLogProcessor = new AttributeLogProcessor({ ...this.context.tags, ...this.commonProperties });
            (logs.getLoggerProvider() as LoggerProvider).addLogRecordProcessor(this._attributeLogProcessor);

            // Warn if any config warnings were generated during parsing
            for (let i = 0; i < this._configWarnings.length; i++) {
                diag.warn(this._configWarnings[i]);
            }
        } 
        catch (error) {
            diag.error(`Failed to initialize TelemetryClient ${error}`);
        }
    }

    /**
     * Log information about availability of an application
     * @param telemetry      Object encapsulating tracking options
     */
    public trackAvailability(telemetry: Contracts.AvailabilityTelemetry): void {
        if (!this._isInitialized) {
            this.initialize();
        }
        this._logApi.trackAvailability(telemetry);
    }

    /**
     * Log a page view
     * @param telemetry      Object encapsulating tracking options
     */
    public trackPageView(telemetry: Contracts.PageViewTelemetry): void {
        if (!this._isInitialized) {
            this.initialize();
        }
        this._logApi.trackPageView(telemetry);
    }

    /**
     * Log a trace message
     * @param telemetry      Object encapsulating tracking options
     */
    public trackTrace(telemetry: Contracts.TraceTelemetry): void {
        if (!this._isInitialized) {
            this.initialize();
        }
        this._logApi.trackTrace(telemetry);
    }

    /**
     * Log an exception
     * @param telemetry      Object encapsulating tracking options
     */
    public trackException(telemetry: Contracts.ExceptionTelemetry): void {
        if (!this._isInitialized) {
            this.initialize();
        }
        this._logApi.trackException(telemetry);
    }

    /**
     * Log a user action or other occurrence.
     * @param telemetry      Object encapsulating tracking options
     */
    public trackEvent(telemetry: Contracts.EventTelemetry): void {
        if (!this._isInitialized) {
            this.initialize();
        }
        this._logApi.trackEvent(telemetry);
    }

    /**
     * Log a numeric value that is not associated with a specific event. Typically used to send regular reports of performance indicators.
     * To send a single measurement, use just the first two parameters. If you take measurements very frequently, you can reduce the
     * telemetry bandwidth by aggregating multiple measurements and sending the resulting average at intervals.
     * @param telemetry      Object encapsulating tracking options
     */
    public trackMetric(telemetry: Contracts.MetricPointTelemetry & Contracts.MetricTelemetry): void {
        if (!this._isInitialized) {
            this.initialize();
        }
        // Create custom metric
        try {
            const meter = metrics.getMeterProvider().getMeter("ApplicationInsightsMetrics");
            const histogram = meter.createHistogram(telemetry.name);
            histogram.record(telemetry.value, { ...telemetry.properties, ...this.commonProperties, ...this.context.tags });
        } catch (error) {
            diag.error(`Failed to record metric: ${error}`);
        }
    }

    /**
     * Log a request. Note that the default client will attempt to collect HTTP requests automatically so only use this for requests
     * that aren't automatically captured or if you've disabled automatic request collection.
     *
     * @param telemetry      Object encapsulating tracking options
     */
    public trackRequest(telemetry: Contracts.RequestTelemetry): void {
        if (!this._isInitialized) {
            this.initialize();
        }
        const startTime = telemetry.time || new Date();
        const endTime = startTime.getTime() + telemetry.duration;

        const ctx = context.active();
        const attributes: Attributes = {
            ...telemetry.properties,
        };
        attributes[SEMATTRS_HTTP_METHOD] = "HTTP";
        attributes[SEMATTRS_HTTP_URL] = telemetry.url;
        attributes[SEMATTRS_HTTP_STATUS_CODE] = telemetry.resultCode;
        const options: SpanOptions = {
            kind: SpanKind.SERVER,
            attributes: attributes,
            startTime: startTime,
        };
        const span: any = trace.getTracer("ApplicationInsightsTracer")
            .startSpan(telemetry.name, options, ctx);
        span.setStatus({
            code: telemetry.success ? SpanStatusCode.OK : SpanStatusCode.ERROR,
        });
        span.end(endTime);
    }

    /**
     * Log a dependency. Note that the default client will attempt to collect dependencies automatically so only use this for dependencies
     * that aren't automatically captured or if you've disabled automatic dependency collection.
     *
     * @param telemetry      Object encapsulating tracking option
     * */
    public trackDependency(telemetry: Contracts.DependencyTelemetry) {
        if (!this._isInitialized) {
            this.initialize();
        }
        const startTime = telemetry.time || new Date();
        const endTime = startTime.getTime() + telemetry.duration;
        if (telemetry && !telemetry.target && telemetry.data) {
            // url.parse().host returns null for non-urls,
            // making this essentially a no-op in those cases
            // If this logic is moved, update jsdoc in DependencyTelemetry.target
            // url.parse() is deprecated, update to use WHATWG URL API instead
            try {
                telemetry.target = new URL(telemetry.data).host;
            } catch (error) {
                // set target as null to be compliant with previous behavior
                telemetry.target = null;
                diag.warn(this.constructor.name, "Failed to create URL.", error);
            }
        }
        const ctx = context.active();
        const attributes: Attributes = {
            ...telemetry.properties,
        };
        if (telemetry.dependencyTypeName) {
            if (telemetry.dependencyTypeName.toLowerCase().indexOf("http") > -1) {
                attributes[SEMATTRS_HTTP_METHOD] = "HTTP";
                attributes[SEMATTRS_HTTP_URL] = telemetry.data;
                attributes[SEMATTRS_HTTP_STATUS_CODE] = telemetry.resultCode;
            } else if (Util.getInstance().isDbDependency(telemetry.dependencyTypeName)) {
                attributes[SEMATTRS_DB_SYSTEM] = telemetry.dependencyTypeName;
                attributes[SEMATTRS_DB_STATEMENT] = telemetry.data;
            } else if (telemetry.dependencyTypeName.toLowerCase().indexOf("rpc") > -1) {
                attributes[SEMATTRS_RPC_SYSTEM] = telemetry.dependencyTypeName;
                attributes[SEMATTRS_RPC_METHOD] = telemetry.data;
                attributes[SEMATTRS_RPC_GRPC_STATUS_CODE] = telemetry.resultCode;
            }
        }
        if (telemetry.target) {
            attributes[SEMATTRS_PEER_SERVICE] = telemetry.target;
        }
        const options: SpanOptions = {
            kind: SpanKind.CLIENT,
            attributes: attributes,
            startTime: startTime,
        };
        const span: any = trace.getTracer("ApplicationInsightsTracer")
            .startSpan(telemetry.name, options, ctx);
        span.setStatus({
            code: telemetry.success ? SpanStatusCode.OK : SpanStatusCode.ERROR,
        });
        span.end(endTime);
    }
    /**
     * Generic track method for all telemetry types
     * @param data the telemetry to send
     * @param telemetryType specify the type of telemetry you are tracking from the list of Contracts.DataTypes
     */
    public track(telemetry: Contracts.Telemetry, telemetryType: Contracts.TelemetryType) {
        throw new Error(`Not implemented. Please use the specific track method for the type of telemetry you are tracking. ${UNSUPPORTED_MSG}`);
    }

    /**
     * Automatically populate telemetry properties like RoleName when running in Azure
     *
     * @param value if true properties will be populated
     */
    public setAutoPopulateAzureProperties() {
        // NO-OP
    }

    /**
     * Get Authorization handler
     */
    public getAuthorizationHandler(config: Config): void {
        diag.warn(`getAuthorizationHandler is not supported in ApplicationInsights any longer. ${UNSUPPORTED_MSG}`);
    }

    /*
     * Get Statsbeat instance
     */
    public getStatsbeat(): any {
        return null;
    }

    public setUseDiskRetryCaching(
        value: boolean,
        resendInterval?: number,
        maxBytesOnDisk?: number
    ) {
        throw new Error("Not implemented");
    }

    /**
     * Adds telemetry processor to the collection. Telemetry processors will be called one by one
     * before telemetry item is pushed for sending and in the order they were added.
     *
     * @param telemetryProcessor function, takes Envelope, and optional context object and returns boolean
     */
    public addTelemetryProcessor(
        telemetryProcessor: (
            envelope: Envelope,
            contextObjects?: { [name: string]: any }
        ) => boolean
    ) {
        diag.warn(`addTelemetryProcessor is not supported in ApplicationInsights any longer. ${UNSUPPORTED_MSG}`);
    }

    /*
     * Removes all telemetry processors
     */
    public clearTelemetryProcessors() {
        throw new Error("Not implemented");
    }

    public trackNodeHttpRequestSync(telemetry: Contracts.NodeHttpRequestTelemetry) {
        diag.warn("trackNodeHttpRequestSync is not implemented and is a no-op. Please use trackRequest instead.");
    }

    public trackNodeHttpRequest(telemetry: Contracts.NodeHttpRequestTelemetry) {
        diag.warn("trackNodeHttpRequest is not implemented and is a no-op. Please use trackRequest instead.");
    }

    public trackNodeHttpDependency(telemetry: Contracts.NodeHttpRequestTelemetry) {
        diag.warn("trackNodeHttpDependency is not implemented and is a no-op. Please use trackDependency instead.");
    }

    /**
    * Immediately send all queued telemetry.
    */
    public async flush(): Promise<void> {
        return flushAzureMonitor();
    }

    /**
     * Shutdown client
     */
    public async shutdown(): Promise<void> {
        return shutdownAzureMonitor();
    }

    public pushWarningToLog(warning: string) {
        this._configWarnings.push(warning);
    }
}
