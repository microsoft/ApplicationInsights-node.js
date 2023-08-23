// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Attributes, context, DiagLogLevel, SpanKind, SpanOptions, SpanStatusCode, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { HttpInstrumentationConfig } from "@opentelemetry/instrumentation-http";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import * as Contracts from "../declarations/contracts";
import { TelemetryItem as Envelope } from "../declarations/generated";
import { Context } from "./context";
import { Logger } from "../shared/logging";
import { Util } from "../shared/util";
import { ApplicationInsightsOptions, ExtendedMetricType } from "../types";
import { IConfig } from "../shim/types";
import Config = require("./config");
import { dispose, Configuration } from "./shim-applicationinsights";
import ConfigHelper = require("../shared/util/configHelper");
import { ApplicationInsightsClient } from "../applicationInsightsClient";
import { LogApi } from "../logs/api";

/**
 * Application Insights telemetry client provides interface to track telemetry items, register telemetry initializers and
 * and manually trigger immediate sending (flushing)
 */
export class TelemetryClient {
    private _options: ApplicationInsightsOptions;
    private _client: ApplicationInsightsClient;
    private _logApi: LogApi;
    public context: Context;
    public commonProperties: { [key: string]: string }; // TODO: Add setter so Resources are updated
    public config: IConfig;

    /**
     * Constructs a new instance of TelemetryClient
     * @param setupString the Connection String or Instrumentation Key to use (read from environment variable if not specified)
     */
    constructor(input?: string | ApplicationInsightsOptions) {
        // If the user does not pass a new connectionString, use the one defined in the _options
        const config = new Config(typeof (input) === "string" ? input : input?.azureMonitorExporterConfig?.connectionString);
        this.config = config;
        this._logApi = new LogApi(logs.getLogger("ApplicationInsightsLogger"));

        this.commonProperties = {};
        this.context = new Context();
        if (input) {
            if (typeof (input) === "object") {
                this._options = input;
            } else {
                // TODO: Add Support for iKey as well
                this._options = {
                    azureMonitorExporterConfig: {
                        connectionString: input,
                    },
                };
            }
        }
    }

    /**
     * Parse the config property to set the appropriate values on the ApplicationInsightsOptions
     * @param input 
     */
    private _parseConfig(input?: ApplicationInsightsOptions) {
        // If we have a defined input (in the case that we are initializing from the start method) then we should use that
        if (input) {
            this._options = input;
        }

        const resendInterval: number | undefined = this.config.enableResendInterval;
        if (this.config.disableAppInsights) {
            dispose();
        }

        if (this.config.instrumentationKey && this.config.endpointUrl) {
            this._options.azureMonitorExporterConfig.connectionString = `InstrumentationKey=${this.config.instrumentationKey};IngestionEndpoint=${this.config.endpointUrl}`;
        }

        this._options.samplingRatio = this.config.samplingPercentage ? (this.config.samplingPercentage / 100) : 1;

        this._options.instrumentationOptions = {
            http: {
                ...input?.instrumentationOptions?.http,
                ignoreOutgoingUrls: this.config.correlationHeaderExcludedDomains,
            } as HttpInstrumentationConfig,
        }

        if (this.config.aadTokenCredential) {
            this._options.azureMonitorExporterConfig.credential = this.config.aadTokenCredential;
        }

        if (typeof (this.config.enableAutoCollectConsole) === "boolean") {
            const setting: boolean = this.config.enableAutoCollectConsole;
            this._options.logInstrumentationOptions = {
                ...this._options.logInstrumentationOptions,
                console: { enabled: setting },
            }
        }

        if (typeof (this.config.enableAutoCollectExceptions) === "boolean") {
            this._options.enableAutoCollectExceptions = this.config.enableAutoCollectExceptions;
        }

        if (typeof (this.config.enableAutoCollectDependencies) === "boolean") {
            ConfigHelper.setAutoCollectDependencies(this._options, this.config.enableAutoCollectDependencies);
        }

        if (typeof (this.config.enableAutoCollectRequests) === "boolean") {
            ConfigHelper.setAutoCollectRequests(this._options, this.config.enableAutoCollectRequests);
        }

        if (typeof (this.config.enableAutoCollectPerformance) === "boolean") {
            ConfigHelper.setAutoCollectPerformance(this._options, this.config.enableAutoCollectPerformance);
        }

        if (typeof (this.config.enableAutoCollectExternalLoggers) === "boolean") {
            this._options.logInstrumentationOptions = {
                ...this._options.logInstrumentationOptions,
                winston: { enabled: this.config.enableAutoCollectExternalLoggers },
                bunyan: { enabled: this.config.enableAutoCollectExternalLoggers },
            }
        }

        if (typeof (this.config.enableAutoCollectPreAggregatedMetrics) === "boolean") {
            // TODO: Add support for this config in shim
        }

        if (typeof (this.config.enableAutoCollectHeartbeat) === "boolean") {
            Configuration.setAutoCollectHeartbeat(this.config.enableAutoCollectHeartbeat);
        }

        if (typeof (this.config.enableAutoDependencyCorrelation) === "boolean") {
            Configuration.setAutoDependencyCorrelation(this.config.enableAutoDependencyCorrelation);
        }

        if (typeof (this.config.enableAutoCollectIncomingRequestAzureFunctions) === "boolean") {
            Configuration.setAutoCollectIncomingRequestAzureFunctions(this.config.enableAutoCollectIncomingRequestAzureFunctions);
        }

        if (typeof (this.config.enableSendLiveMetrics) === "boolean") {
            Configuration.setSendLiveMetrics(this.config.enableSendLiveMetrics);
        }

        if (typeof (this.config.enableUseDiskRetryCaching) === "boolean") {
            Configuration.setUseDiskRetryCaching(this.config.enableUseDiskRetryCaching);
        }

        if (this.config.enableUseAsyncHooks === false) {
            Logger.getInstance().warn("The use of non async hooks is no longer supported.");
        }

        if (typeof (this.config.distributedTracingMode) === "boolean") {
            Configuration.setDistributedTracingMode(this.config.distributedTracingMode);
        }

        if (typeof (this.config.enableAutoCollectExtendedMetrics) === "boolean") {
            const setting = this.config.enableAutoCollectExtendedMetrics;
            this._options.extendedMetrics = {
                [ExtendedMetricType.gc]: setting,
                [ExtendedMetricType.heap]: setting,
                [ExtendedMetricType.loop]: setting,
            }
        }

        if (this.config.enableResendInterval) {
            Configuration.setUseDiskRetryCaching(true, this.config.enableResendInterval);
        }

        if (this.config.enableMaxBytesOnDisk) {
            Configuration.setUseDiskRetryCaching(true, resendInterval, this.config.enableMaxBytesOnDisk);
        }

        if (typeof (this.config.enableInternalDebugLogging) === "boolean") {
            if (this.config.enableInternalDebugLogging) {
                Logger.getInstance().updateLogLevel(DiagLogLevel.DEBUG);
            }
        }

        if (typeof (this.config.enableInternalWarningLogging) === "boolean") {
            if (this.config.enableInternalWarningLogging) {
                Logger.getInstance().updateLogLevel(DiagLogLevel.WARN);
            }
        }

        // Disable or enable all extended metrics
        if (this.config.disableAllExtendedMetrics === true) {
            for (const type in this._options.extendedMetrics) {
                this._options.extendedMetrics[type] = false;
            }
            this._options.extendedMetrics = {
                [ExtendedMetricType.gc]: false,
                [ExtendedMetricType.heap]: false,
                [ExtendedMetricType.loop]: false,
            };
        }

        if (typeof (this.config.disableStatsbeat) === "boolean") {
            Logger.getInstance().warn("The disableStatsbeat configuration option is deprecated.");
        }

        if (this.config.extendedMetricDisablers) {
            const disabler = this.config.extendedMetricDisablers;
            this._options.extendedMetrics[disabler] = false;
        }

        if (this.config.ignoreLegacyHeaders === false) {
            Logger.getInstance().warn("LegacyHeaders are not supported by the shim.");
        }

        if (this.config.proxyHttpUrl || this.config.proxyHttpsUrl) {
            const proxyUrl = new URL(this.config.proxyHttpsUrl || this.config.proxyHttpUrl);
            this._options.azureMonitorExporterConfig.proxyOptions = {
                host: proxyUrl.hostname,
                port: Number(proxyUrl.port),
            }
        }

        if (this.config.maxBatchSize) {
            Logger.getInstance().warn("The maxBatchSize configuration option is not supported by the shim.");
        }

        if (this.config.maxBatchIntervalMs) {
            this._options.otlpTraceExporterConfig = { ...this._options.otlpTraceExporterConfig, timeoutMillis: this.config.maxBatchIntervalMs };
            this._options.otlpMetricExporterConfig = { ...this._options.otlpMetricExporterConfig, timeoutMillis: this.config.maxBatchIntervalMs };
            this._options.otlpLogExporterConfig = { ...this._options.otlpLogExporterConfig, timeoutMillis: this.config.maxBatchIntervalMs };
        }

        if (this.config.correlationIdRetryIntervalMs) {
            Logger.getInstance().warn("The correlationIdRetryIntervalMs configuration option is not supported by the shim.");
        }

        if (this.config.enableLoggerErrorToTrace) {
            Logger.getInstance().warn("The enableLoggerErrorToTrace configuration option is not supported by the shim.");
        }

        if (this.config.httpAgent || this.config.httpsAgent) {
            Logger.getInstance().warn("The httpAgent and httpsAgent configuration options are not supported by the shim.");
        }

        if (this.config.enableWebInstrumentation || this.config.webInstrumentationConfig || this.config.webInstrumentationSrc || this.config.webInstrumentationConnectionString) {
            Logger.getInstance().warn("The webInstrumentation configuration options are not supported by the shim.");
        }
    }

    /**
     * Starts automatic collection of telemetry. Prior to calling start no telemetry will be collected
     * @param input Set of options to configure the Azure Monitor Client
     */
    public start(input?: ApplicationInsightsOptions) {
        this._parseConfig(input);
        this._client = new ApplicationInsightsClient(this._options);
    }

    /**
     * Log information about availability of an application
     * @param telemetry      Object encapsulating tracking options
     */
    public trackAvailability(telemetry: Contracts.AvailabilityTelemetry): void {
        this._logApi.trackAvailability(telemetry);
    }

    /**
     * Log a page view
     * @param telemetry      Object encapsulating tracking options
     */
    public trackPageView(telemetry: Contracts.PageViewTelemetry): void {
        this._logApi.trackPageView(telemetry);
    }

    /**
     * Log a trace message
     * @param telemetry      Object encapsulating tracking options
     */
    public trackTrace(telemetry: Contracts.TraceTelemetry): void {
        this._logApi.trackTrace(telemetry);
    }

    /**
     * Log an exception
     * @param telemetry      Object encapsulating tracking options
     */
    public trackException(telemetry: Contracts.ExceptionTelemetry): void {
        this._logApi.trackException(telemetry);
    }

    /**
     * Log a user action or other occurrence.
     * @param telemetry      Object encapsulating tracking options
     */
    public trackEvent(telemetry: Contracts.EventTelemetry): void {
        this._logApi.trackEvent(telemetry);
    }

    /**
     * Log a numeric value that is not associated with a specific event. Typically used to send regular reports of performance indicators.
     * To send a single measurement, use just the first two parameters. If you take measurements very frequently, you can reduce the
     * telemetry bandwidth by aggregating multiple measurements and sending the resulting average at intervals.
     * @param telemetry      Object encapsulating tracking options
     */
    public trackMetric(telemetry: Contracts.MetricTelemetry): void {
        // TODO : Create custom metric
        // let meter = this.client.getMetricHandler().getCustomMetricsHandler().getMeter();
        // let metricName = "";
        // let options: MetricOptions = {};
        // meter.createHistogram(metricName, options)
    }

    /**
     * Log a request. Note that the default client will attempt to collect HTTP requests automatically so only use this for requests
     * that aren't automatically captured or if you've disabled automatic request collection.
     *
     * @param telemetry      Object encapsulating tracking options
     */
    public trackRequest(telemetry: Contracts.RequestTelemetry): void {
        const startTime = telemetry.time || new Date();
        const endTime = startTime.getTime() + telemetry.duration;

        // TODO: Change resourceManager if ID is provided?
        const ctx = context.active();
        const attributes: Attributes = {
            ...telemetry.properties,
        };
        attributes[SemanticAttributes.HTTP_METHOD] = "HTTP";
        attributes[SemanticAttributes.HTTP_URL] = telemetry.url;
        attributes[SemanticAttributes.HTTP_STATUS_CODE] = telemetry.resultCode;
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
                Logger.getInstance().warn(this.constructor.name, "Failed to create URL.", error);
            }
        }
        const ctx = context.active();
        const attributes: Attributes = {
            ...telemetry.properties,
        };
        if (telemetry.dependencyTypeName) {
            if (telemetry.dependencyTypeName.toLowerCase().indexOf("http") > -1) {
                attributes[SemanticAttributes.HTTP_METHOD] = "HTTP"; // TODO: Dependency doesn't expose method in any property
                attributes[SemanticAttributes.HTTP_URL] = telemetry.data;
                attributes[SemanticAttributes.HTTP_STATUS_CODE] = telemetry.resultCode;
            } else if (Util.getInstance().isDbDependency(telemetry.dependencyTypeName)) {
                attributes[SemanticAttributes.DB_SYSTEM] = telemetry.dependencyTypeName;
                attributes[SemanticAttributes.DB_STATEMENT] = telemetry.data;
            }
        }
        if (telemetry.target) {
            attributes[SemanticAttributes.PEER_SERVICE] = telemetry.target;
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
        throw new Error("Not implemented");
    }

    /**
     * Automatically populate telemetry properties like RoleName when running in Azure
     *
     * @param value if true properties will be populated
     */
    public setAutoPopulateAzureProperties() {
        // TODO: Config is only used during initialization of ResourceManager so it cannot be set after.
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
        Logger.getInstance().warn("addTelemetryProcessor is not supported in ApplicationInsights any longer.");
    }

    /*
     * Removes all telemetry processors
     */
    public clearTelemetryProcessors() {
        throw new Error("Not implemented");
    }

    public trackNodeHttpRequestSync(telemetry: Contracts.NodeHttpRequestTelemetry) {
        Logger.getInstance().warn("trackNodeHttpRequestSync is not implemented and is a no-op. Please use trackRequest instead.");
    }

    public trackNodeHttpRequest(telemetry: Contracts.NodeHttpRequestTelemetry) {
        Logger.getInstance().warn("trackNodeHttpRequest is not implemented and is a no-op. Please use trackRequest instead.");
    }

    public trackNodeHttpDependency(telemetry: Contracts.NodeHttpRequestTelemetry) {
        Logger.getInstance().warn("trackNodeHttpDependency is not implemented and is a no-op. Please use trackDependency instead.");
    }

    /**
    * Immediately send all queued telemetry.
    */
    public async flush(): Promise<void> {
        this._client.flush();
    }

    /**
     * Shutdown client
     */
    public async shutdown(): Promise<void> {
        this._client.shutdown();
    }
}
