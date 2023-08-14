// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogRecord } from "@opentelemetry/api-logs";
import { LogRecord as SDKLogRecord } from "@opentelemetry/sdk-logs";
import { AzureMonitorOpenTelemetryClient } from "@azure/monitor-opentelemetry";
import { Attributes, context, DiagLogLevel, SpanKind, SpanOptions, SpanStatusCode } from "@opentelemetry/api";
import { IdGenerator, RandomIdGenerator } from "@opentelemetry/sdk-trace-base";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import * as Contracts from "../declarations/contracts";
import { AvailabilityData, TelemetryItem as Envelope, KnownSeverityLevel, MessageData, MonitorDomain, PageViewData, TelemetryEventData, TelemetryExceptionData, TelemetryExceptionDetails } from "../declarations/generated";
import { Context } from "./context";
import { Logger } from "./logging";
import { Util } from "./util";
import { AutoCollectConsole } from "./autoCollection/console";
import { AutoCollectExceptions, parseStack } from "./autoCollection/exceptions";
import { ApplicationInsightsOptions, ExtendedMetricType } from "../types";
import { InternalConfig } from "./configuration/internal";
import { IConfig } from "../shim/types";
import Config = require("./configuration/config");
import { dispose, Configuration, _setupCalled } from "./shim-applicationinsights";
import { HttpInstrumentationConfig } from "@opentelemetry/instrumentation-http";
import ConfigHelper = require("./util/configHelper");

/**
 * Application Insights telemetry client provides interface to track telemetry items, register telemetry initializers and
 * and manually trigger immediate sending (flushing)
 */
export class TelemetryClient {
    private _internalConfig: InternalConfig;
    private _options: ApplicationInsightsOptions;
    private _client: AzureMonitorOpenTelemetryClient;
    private _console: AutoCollectConsole;
    private _exceptions: AutoCollectExceptions;
    private _idGenerator: IdGenerator;
    public context: Context;
    public commonProperties: { [key: string]: string }; // TODO: Add setter so Resources are updated
    public config: IConfig;

    /**
     * Constructs a new client of the client
     * @param setupString the Connection String or Instrumentation Key to use (read from environment variable if not specified)
     */
    constructor(input?: string | ApplicationInsightsOptions) {
        // If the user does not pass a new connectionString, use the one defined in the _options
        const config = new Config(typeof(input) === "string" ? input : input?.azureMonitorExporterConfig?.connectionString);
        this.config = config;

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
        // If not running the shim, we should start the AzureMonitorClient as a part of the constructor
        if (!_setupCalled) {
            this.start();
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
            this._options.azureMonitorExporterConfig.aadTokenCredential = this.config.aadTokenCredential;
        }

        if (typeof(this.config.enableAutoCollectConsole) === "boolean") {
            const setting: boolean = this.config.enableAutoCollectConsole;
            this._options.logInstrumentations = {
                ...this._options.logInstrumentations,
                console: { enabled: setting },
            }
        }

        if (typeof(this.config.enableAutoCollectExceptions) === "boolean") {
            this._options.enableAutoCollectExceptions = this.config.enableAutoCollectExceptions;
        }

        if (typeof(this.config.enableAutoCollectDependencies) === "boolean") {
            ConfigHelper.setAutoCollectDependencies(this._options, this.config.enableAutoCollectDependencies);
        }

        if (typeof(this.config.enableAutoCollectRequests) === "boolean") {
            ConfigHelper.setAutoCollectRequests(this._options, this.config.enableAutoCollectRequests);
        }

        if (typeof(this.config.enableAutoCollectPerformance) === "boolean") {
            ConfigHelper.setAutoCollectPerformance(this._options, this.config.enableAutoCollectPerformance);
        }

        if (typeof(this.config.enableAutoCollectExternalLoggers) === "boolean") {
            this._options.logInstrumentations = {
                ...this._options.logInstrumentations,
                winston: { enabled: this.config.enableAutoCollectExternalLoggers },
                bunyan: { enabled: this.config.enableAutoCollectExternalLoggers },
            }
        }

        if (typeof(this.config.enableAutoCollectPreAggregatedMetrics) === "boolean") {
            this._options.enableAutoCollectStandardMetrics = this.config.enableAutoCollectPreAggregatedMetrics;
        }

        if (typeof(this.config.enableAutoCollectHeartbeat) === "boolean") {
            Configuration.setAutoCollectHeartbeat(this.config.enableAutoCollectHeartbeat);
        }

        if (typeof(this.config.enableAutoDependencyCorrelation) === "boolean") {
            Configuration.setAutoDependencyCorrelation(this.config.enableAutoDependencyCorrelation);
        }

        if (typeof(this.config.enableAutoCollectIncomingRequestAzureFunctions) === "boolean") {
            Configuration.setAutoCollectIncomingRequestAzureFunctions(this.config.enableAutoCollectIncomingRequestAzureFunctions);
        }

        if (typeof(this.config.enableSendLiveMetrics) === "boolean") {
            Configuration.setSendLiveMetrics(this.config.enableSendLiveMetrics);
        }

        if (typeof(this.config.enableUseDiskRetryCaching) === "boolean") {
            Configuration.setUseDiskRetryCaching(this.config.enableUseDiskRetryCaching);
        }

        if (this.config.enableUseAsyncHooks === false) {
            Logger.getInstance().warn("The use of non async hooks is no longer supported.");
        }

        if (typeof(this.config.distributedTracingMode) === "boolean") {
            Configuration.setDistributedTracingMode(this.config.distributedTracingMode);
        }

        if (typeof(this.config.enableAutoCollectExtendedMetrics) === "boolean") {
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

        if (typeof(this.config.enableInternalDebugLogging) === "boolean") {
            if (this.config.enableInternalDebugLogging) {
                Logger.getInstance().updateLogLevel(DiagLogLevel.DEBUG);
            }
        }

        if (typeof(this.config.enableInternalWarningLogging) === "boolean") {
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

        if (typeof(this.config.disableStatsbeat) === "boolean") {
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
        // Only parse config if we're running the shim
        if (_setupCalled) {
            this._parseConfig(input);
        }
        this._internalConfig = new InternalConfig(this._options);
        this._client = new AzureMonitorOpenTelemetryClient(this._options);
        this._console = new AutoCollectConsole(this);
        if (this._internalConfig.enableAutoCollectExceptions) {
            this._exceptions = new AutoCollectExceptions(this);
        }
        this._idGenerator = new RandomIdGenerator();
        this._console.enable(this._internalConfig.logInstrumentations);
    }

    public getAzureMonitorOpenTelemetryClient(): AzureMonitorOpenTelemetryClient {
        return this._client;
    }

    public getInternalConfig(): InternalConfig {
        return this._internalConfig;
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
            this._client.getLogger().emit(logRecord);
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
            this._client.getLogger().emit(logRecord);
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
            this._client.getLogger().emit(logRecord);
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
            this._client.getLogger().emit(logRecord);
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
            this._client.getLogger().emit(logRecord);
        } catch (err) {
            Logger.getInstance().error("Failed to send telemetry.", err);
        }
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
        const span: any = this._client
            .getTracer()
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
        const span: any = this._client
            .getTracer()
            .startSpan(telemetry.name, options, ctx);
        span.setStatus({
            code: telemetry.success ? SpanStatusCode.OK : SpanStatusCode.ERROR,
        });
        span.end(endTime);
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
        this._console.shutdown();
        this._console = null;
        this._exceptions?.shutdown();
        this._exceptions = null;
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

    public trackNodeHttpRequestSync(telemetry: Contracts.NodeHttpRequestTelemetry) {
        Logger.getInstance().warn("trackNodeHttpRequestSync is not implemented and is a no-op. Please use trackRequest instead.");
    }

    public trackNodeHttpRequest(telemetry: Contracts.NodeHttpRequestTelemetry) {
        Logger.getInstance().warn("trackNodeHttpRequest is not implemented and is a no-op. Please use trackRequest instead.");
    }

    public trackNodeHttpDependency(telemetry: Contracts.NodeHttpRequestTelemetry) {
        Logger.getInstance().warn("trackNodeHttpDependency is not implemented and is a no-op. Please use trackDependency instead.");
    }
}
