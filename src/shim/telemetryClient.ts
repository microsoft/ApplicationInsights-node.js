// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Attributes, Meter, Tracer, context, metrics, SpanKind, SpanOptions, SpanStatusCode, diag, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
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
import { AttributeLogProcessor } from "../shared/util/attributeLogRecordProcessor";
import { LogApi } from "./logsApi";
import { flushAzureMonitor, shutdownAzureMonitor, useAzureMonitor } from "../main";
import { AzureMonitorOpenTelemetryOptions } from "../types";
import { TelemetryClientProvider } from "./telemetryClientProvider";
import { TelemetryClientOptions,  UNSUPPORTED_MSG, StatsbeatFeature } from "./types";
import { StatsbeatFeaturesManager } from "../shared/util/statsbeatFeaturesManager";

/**
 * Application Insights telemetry client provides interface to track telemetry items, register telemetry initializers and
 * and manually trigger immediate sending (flushing)
 */
export class TelemetryClient {
    private static _instanceCount = 0;
    public context: Context;
    public commonProperties: { [key: string]: string };
    public config: Config;
    private _attributeSpanProcessor: AttributeSpanProcessor;
    private _attributeLogProcessor: AttributeLogProcessor;
    private _logApi: LogApi;
    private _isInitialized: boolean;
    private _options: AzureMonitorOpenTelemetryOptions;
    private _telemetryClientProvider?: TelemetryClientProvider;
    private _useGlobalProviders: boolean;
    private _manualTracer?: Tracer;
    private _manualMeter?: Meter;
    private _configWarnings: string[] = [];

    /**
     * Constructs a new instance of TelemetryClient
     * @param setupString the Connection String or Instrumentation Key to use (read from environment variable if not specified)
     */
    constructor(input?: string, options?: TelemetryClientOptions) {
        TelemetryClient._instanceCount++;
        
        // Set statsbeat feature if this is the second or subsequent TelemetryClient instance
        if (TelemetryClient._instanceCount >= 2) {
            StatsbeatFeaturesManager.getInstance().enableFeature(StatsbeatFeature.MULTI_IKEY);
        }
        
        const config = new Config(input, this._configWarnings);
        this.config = config;
        this.commonProperties = {};
        this.context = new Context();
        this._isInitialized = false;
        this._useGlobalProviders = options?.useGlobalProviders ?? false;
    }

    public initialize() {
        if (this._isInitialized) {
            return;
        }
        this._isInitialized = true;
        // Parse shim config to Azure Monitor options
        this._options = this.config.parseConfig();
        try {
            this._attributeSpanProcessor = new AttributeSpanProcessor({ ...this.context.tags, ...this.commonProperties });
            this._attributeLogProcessor = new AttributeLogProcessor({ ...this.context.tags, ...this.commonProperties });
            this._options.spanProcessors = [...(this._options.spanProcessors || []), this._attributeSpanProcessor];
            this._options.logRecordProcessors = [...(this._options.logRecordProcessors || []), this._attributeLogProcessor];

            if (this._useGlobalProviders) {
                useAzureMonitor(this._options);
            } else {
                this._telemetryClientProvider = new TelemetryClientProvider(this._options);
            }

            const logger = this._useGlobalProviders
                ? logs.getLogger("ApplicationInsightsLogger")
                : this._telemetryClientProvider.getLogger("ApplicationInsightsLogger");
            this._logApi = new LogApi(logger);

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
            const meter = this._getMeterInstance();
            const histogram = meter.createHistogram(telemetry.name);
            histogram.record(telemetry.value, { ...telemetry.properties, ...this.commonProperties, ...this.context.tags });
        } catch (error) {
            diag.error(`Failed to record metric: ${error}`);
        }
    }

    private _getTracerInstance(): Tracer {
        if (this._telemetryClientProvider) {
            if (!this._manualTracer) {
                this._manualTracer = this._telemetryClientProvider.getTracer("ApplicationInsightsTracer");
            }
            return this._manualTracer;
        }
        return trace.getTracer("ApplicationInsightsTracer");
    }

    private _getMeterInstance(): Meter {
        if (this._telemetryClientProvider) {
            if (!this._manualMeter) {
                this._manualMeter = this._telemetryClientProvider.getMeter("ApplicationInsightsMetrics");
            }
            return this._manualMeter;
        }
        return metrics.getMeterProvider().getMeter("ApplicationInsightsMetrics");
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
        // For trackRequest, when time is not specified, treat current time as END time
        // since this method is called after the request operation has completed
        const endTime = telemetry.time ? telemetry.time.getTime() + telemetry.duration : Date.now();
        const startTime = telemetry.time || new Date(endTime - telemetry.duration);

        const ctx = context.active();
        const attributes: Attributes = {
            ...telemetry.properties,
        };
        // Only set HTTP attributes if we have the relevant data
        if (!telemetry.name) {
            attributes[SEMATTRS_HTTP_METHOD] = "HTTP";
        }
        if (telemetry.url) {
            attributes[SEMATTRS_HTTP_URL] = telemetry.url;
        }
        if (telemetry.resultCode) {
            attributes[SEMATTRS_HTTP_STATUS_CODE] = telemetry.resultCode;
        }
        const options: SpanOptions = {
            kind: SpanKind.SERVER,
            attributes: attributes,
            startTime: startTime,
        };
        const span: any = this._getTracerInstance()
            .startSpan(telemetry.name, options, ctx);
            
        if (telemetry.id) {
            try {
                if (span._spanContext) {
                    span._spanContext.traceId = telemetry.id;                
                }
            } catch (error) {
                diag.warn('Unable to set custom traceId on span:', error);
            }
        }
        
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
        // For trackDependency, when time is not specified, treat current time as END time
        // since this method is called after the dependency operation has completed
        const endTime = telemetry.time ? telemetry.time.getTime() + telemetry.duration : Date.now();
        const startTime = telemetry.time || new Date(endTime - telemetry.duration);
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
                // Only set HTTP URL and status code for HTTP dependencies
                if (telemetry.data) {
                    attributes[SEMATTRS_HTTP_URL] = telemetry.data;
                }
                if (telemetry.resultCode) {
                    attributes[SEMATTRS_HTTP_STATUS_CODE] = telemetry.resultCode;
                }
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
        const span: any = this._getTracerInstance()
            .startSpan(telemetry.name, options, ctx);
            
        if (telemetry.id) {
            try {
                if (span._spanContext) {
                    span._spanContext.traceId = telemetry.id;
                }
            } catch (error) {
                diag.warn('Unable to set custom traceId on span:', error);
            }
        }
        
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
        if (this._telemetryClientProvider) {
            return this._telemetryClientProvider.flush();
        }
        return flushAzureMonitor();
    }

    /**
     * Shutdown client
     */
    public async shutdown(): Promise<void> {
        if (this._telemetryClientProvider) {
            return this._telemetryClientProvider.shutdown();
        }
        return shutdownAzureMonitor();
    }

    public pushWarningToLog(warning: string) {
        this._configWarnings.push(warning);
    }
}
