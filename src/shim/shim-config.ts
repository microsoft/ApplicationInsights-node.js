// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import http = require("http");
import https = require("https");
import azureCoreAuth = require("@azure/core-auth");
import { diag } from "@opentelemetry/api";
import { HttpInstrumentationConfig } from "@opentelemetry/instrumentation-http";
import { DistributedTracingModes, IConfig, IDisabledExtendedMetrics, IWebInstrumentationConfig, UNSUPPORTED_MSG } from "./types";
import { ShimJsonConfig } from "./shim-jsonConfig";
import { AzureMonitorOpenTelemetryOptions, InstrumentationOptions, InstrumentationOptionsType } from "../types";

const ENV_azurePrefix = "APPSETTING_"; // Azure adds this prefix to all environment variables
const ENV_iKey = "APPINSIGHTS_INSTRUMENTATIONKEY"; // This key is provided in the readme
const legacy_ENV_iKey = "APPINSIGHTS_INSTRUMENTATION_KEY";
const ENV_profileQueryEndpoint = "APPINSIGHTS_PROFILE_QUERY_ENDPOINT";
const ENV_quickPulseHost = "APPINSIGHTS_QUICKPULSE_HOST";
const ENV_nativeMetricsDisableAll = "APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS";
const ENV_nativeMetricsDisablers = "APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC";
class Config implements IConfig {
    public connectionString: string;
    public endpointUrl: string;
    public maxBatchSize: number;
    public maxBatchIntervalMs: number;
    public disableAppInsights: boolean;
    public samplingPercentage: number;
    public correlationHeaderExcludedDomains: string[];
    public proxyHttpUrl: string;
    public proxyHttpsUrl: string;
    public httpAgent: http.Agent;
    public httpsAgent: https.Agent;
    public ignoreLegacyHeaders: boolean;
    public aadTokenCredential?: azureCoreAuth.TokenCredential;
    public enableAutoCollectConsole: boolean;
    public enableLoggerErrorToTrace: boolean;
    public enableAutoCollectExceptions: boolean;
    public enableAutoCollectPerformance: boolean;
    public enableAutoCollectExternalLoggers: boolean;
    public enableAutoCollectPreAggregatedMetrics: boolean;
    public enableAutoCollectHeartbeat: boolean;
    public enableAutoCollectRequests: boolean;
    public enableAutoCollectDependencies: boolean;
    public enableAutoDependencyCorrelation: boolean;
    public enableAutoCollectIncomingRequestAzureFunctions: boolean;
    public enableSendLiveMetrics: boolean;
    public enableUseDiskRetryCaching: boolean;
    public enableUseAsyncHooks: boolean;
    public distributedTracingMode: DistributedTracingModes;

    public enableAutoCollectExtendedMetrics: boolean | IDisabledExtendedMetrics;
    public enableResendInterval: number;
    public enableMaxBytesOnDisk: number;
    public enableInternalDebugLogging: boolean;
    public enableInternalWarningLogging: boolean;
    public disableAllExtendedMetrics: boolean;
    public extendedMetricDisablers: string;
    public quickPulseHost: string;
    public enableWebInstrumentation: boolean;
    public webInstrumentationConfig: IWebInstrumentationConfig[];
    public webInstrumentationSrc: string;
    public webInstrumentationConnectionString?: string;
    public noPatchModules: string;
    public noDiagnosticChannel: boolean;

    private _configWarnings: string[];

    /**
   * Creates a new Config instance
   * @param setupString Connection String, instrumentationKey is no longer supported here
   */
    constructor(setupString?: string, configWarnings?: string[]){
        // Load config values from env variables and JSON if available
        this._mergeConfig();
        this.connectionString = setupString;
        this.webInstrumentationConfig = this.webInstrumentationConfig || null;
        this.ignoreLegacyHeaders = true;
        this.webInstrumentationConnectionString = this.webInstrumentationConnectionString || "";
        this._configWarnings = configWarnings || [];
    }

    private _mergeConfig() {
        const jsonConfig = ShimJsonConfig.getInstance();
        this.connectionString = jsonConfig.connectionString;
        this.correlationHeaderExcludedDomains = jsonConfig.correlationHeaderExcludedDomains;
        this.disableAllExtendedMetrics = jsonConfig.disableAllExtendedMetrics;
        this.disableAppInsights = jsonConfig.disableAppInsights;
        this.distributedTracingMode = jsonConfig.distributedTracingMode;
        this.enableAutoCollectConsole = jsonConfig.enableAutoCollectConsole;
        this.enableLoggerErrorToTrace = jsonConfig.enableLoggerErrorToTrace;
        this.enableAutoCollectDependencies = jsonConfig.enableAutoCollectDependencies;
        this.enableAutoCollectIncomingRequestAzureFunctions = jsonConfig.enableAutoCollectIncomingRequestAzureFunctions;
        this.enableAutoCollectExceptions = jsonConfig.enableAutoCollectExceptions;
        this.enableAutoCollectExtendedMetrics = jsonConfig.enableAutoCollectExtendedMetrics;
        this.enableAutoCollectExternalLoggers = jsonConfig.enableAutoCollectExternalLoggers;
        this.enableAutoCollectHeartbeat = jsonConfig.enableAutoCollectHeartbeat;
        this.enableAutoCollectPerformance = jsonConfig.enableAutoCollectPerformance;
        this.enableAutoCollectPreAggregatedMetrics = jsonConfig.enableAutoCollectPreAggregatedMetrics;
        this.enableAutoCollectRequests = jsonConfig.enableAutoCollectRequests;
        this.enableAutoDependencyCorrelation = jsonConfig.enableAutoDependencyCorrelation;
        this.enableInternalDebugLogging = jsonConfig.enableInternalDebugLogging;
        this.enableInternalWarningLogging = jsonConfig.enableInternalWarningLogging;
        this.enableResendInterval = jsonConfig.enableResendInterval;
        this.enableMaxBytesOnDisk = jsonConfig.enableMaxBytesOnDisk;
        this.enableSendLiveMetrics = jsonConfig.enableSendLiveMetrics;
        this.enableUseAsyncHooks = jsonConfig.enableUseAsyncHooks;
        this.enableUseDiskRetryCaching = jsonConfig.enableUseDiskRetryCaching;
        this.endpointUrl = jsonConfig.endpointUrl;
        this.extendedMetricDisablers = jsonConfig.extendedMetricDisablers;
        this.ignoreLegacyHeaders = jsonConfig.ignoreLegacyHeaders;
        this.maxBatchIntervalMs = jsonConfig.maxBatchIntervalMs;
        this.maxBatchSize = jsonConfig.maxBatchSize;
        this.proxyHttpUrl = jsonConfig.proxyHttpUrl;
        this.proxyHttpsUrl = jsonConfig.proxyHttpsUrl;
        this.quickPulseHost = jsonConfig.quickPulseHost;
        this.samplingPercentage = jsonConfig.samplingPercentage;
        this.enableWebInstrumentation = jsonConfig.enableWebInstrumentation;
        this.webInstrumentationConnectionString = jsonConfig.webInstrumentationConnectionString;
        this.webInstrumentationConfig = jsonConfig.webInstrumentationConfig;
        this.webInstrumentationSrc = jsonConfig.webInstrumentationSrc;
        this.noPatchModules = jsonConfig.noPatchModules;
        this.noDiagnosticChannel = jsonConfig.noDiagnosticChannel
    }

    /**
    * Parse the config property to set the appropriate values on the AzureMonitorOpenTelemetryOptions
    */
    public parseConfig(): AzureMonitorOpenTelemetryOptions {
        const options: AzureMonitorOpenTelemetryOptions = {
            azureMonitorExporterOptions: {
                connectionString: this.connectionString,
                disableOfflineStorage: false,
            },
            enableAutoCollectPerformance: true,
            enableAutoCollectExceptions: true,
            instrumentationOptions: {
                http: { enabled: true },
                azureSdk: { enabled: true },
                mongoDb: { enabled: true },
                mySql: { enabled: true },
                redis: { enabled: true },
                redis4: { enabled: true },
                postgreSql: { enabled: true },
                bunyan: { enabled: true },
                winston: { enabled: true },
            },
            otlpTraceExporterConfig: {},
            otlpMetricExporterConfig: {},
            otlpLogExporterConfig: {},
            enableLiveMetrics: true,
        };
        (options.instrumentationOptions as InstrumentationOptions) = {
            ...options.instrumentationOptions,
            console: { enabled: false },

            
        };
        if (this.samplingPercentage) {
            options.samplingRatio = this.samplingPercentage / 100;
        }
        options.instrumentationOptions = {
            ...options.instrumentationOptions,
            http: {
                ...options.instrumentationOptions?.http,
            } as HttpInstrumentationConfig,
        }
        if (this.aadTokenCredential) {
            options.azureMonitorExporterOptions.credential = this.aadTokenCredential;
        }
        if (typeof (this.enableAutoCollectConsole) === "boolean") {
            const setting: boolean = this.enableAutoCollectConsole;
            (options.instrumentationOptions as InstrumentationOptions) = {
                ...options.instrumentationOptions,
                console: { enabled: setting },
            };
        }
        if (typeof (this.enableAutoCollectExceptions) === "boolean") {
            options.enableAutoCollectExceptions = this.enableAutoCollectExceptions;
        }

        if (this.enableAutoCollectDependencies === false && this.enableAutoCollectRequests === false) {
            options.instrumentationOptions.http.enabled = false;
        }
        else {
            if (this.enableAutoCollectDependencies === false) {
                options.instrumentationOptions = {
                    ...options.instrumentationOptions,
                    http: {
                        ...options.instrumentationOptions?.http,
                        enabled: true,
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        ignoreOutgoingRequestHook: (request: http.RequestOptions) => true,
                    } as HttpInstrumentationConfig
                };
            }
            if (this.enableAutoCollectRequests === false) {
                options.instrumentationOptions = {
                    ...options.instrumentationOptions,
                    http: {
                        ...options.instrumentationOptions?.http,
                        enabled: true,
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        ignoreIncomingRequestHook: (request: http.RequestOptions) => true,
                    } as HttpInstrumentationConfig
                };
            }
        }
        if (typeof (this.enableAutoCollectPerformance) === "boolean") {
            options.enableAutoCollectPerformance = this.enableAutoCollectPerformance;
        }
        if (typeof (this.enableAutoCollectExternalLoggers) === "boolean") {
            (options.instrumentationOptions as InstrumentationOptions) = {
                ...options.instrumentationOptions,
                winston: { enabled: this.enableAutoCollectExternalLoggers },
                bunyan: { enabled: this.enableAutoCollectExternalLoggers },
            };
        }
        if (this.enableUseDiskRetryCaching === false) {
            options.azureMonitorExporterOptions.disableOfflineStorage = true;
        }
        if (this.proxyHttpUrl || this.proxyHttpsUrl) {
            try {
                const proxyUrl = new URL(this.proxyHttpsUrl || this.proxyHttpUrl);
                options.azureMonitorExporterOptions.proxyOptions = {
                    host: proxyUrl.hostname,
                    port: Number(proxyUrl.port),
                };
            }
            catch (err) {
                diag.warn("failed to parse proxy URL.");
            }
        }
        if (this.maxBatchIntervalMs) {
            options.otlpTraceExporterConfig = { ...options.otlpTraceExporterConfig, timeoutMillis: this.maxBatchIntervalMs };
            options.otlpMetricExporterConfig = { ...options.otlpMetricExporterConfig, timeoutMillis: this.maxBatchIntervalMs };
            options.otlpLogExporterConfig = { ...options.otlpLogExporterConfig, timeoutMillis: this.maxBatchIntervalMs };
        }
        if (this.enableInternalWarningLogging === true) {
            // Do not override env variable if present
            if (!process.env["APPLICATIONINSIGHTS_INSTRUMENTATION_LOGGING_LEVEL"]) {
                process.env["APPLICATIONINSIGHTS_INSTRUMENTATION_LOGGING_LEVEL"] = "WARN";
            }

        }
        if (this.enableInternalDebugLogging === true) {
            // Do not override env variable if present
            if (!process.env["APPLICATIONINSIGHTS_INSTRUMENTATION_LOGGING_LEVEL"]) {
                process.env["APPLICATIONINSIGHTS_INSTRUMENTATION_LOGGING_LEVEL"] = "DEBUG";
            }
        }
        if (this.enableAutoCollectPreAggregatedMetrics === false) {
            // Do not override env variable if present
            if (!process.env["APPLICATION_INSIGHTS_NO_STANDARD_METRICS"]) {
                process.env["APPLICATION_INSIGHTS_NO_STANDARD_METRICS"] = "disable";
            }
        }

        if (this.noDiagnosticChannel === true) {
            // Disable all instrumentations except http to conform with AppInsights 2.x behavior
            for (const mod in options.instrumentationOptions) {
                if (mod !== "http") {
                    (options.instrumentationOptions as InstrumentationOptionsType)[mod] = { enabled: false };
                }
            }
        }

        if (this.noPatchModules && this.noDiagnosticChannel !== true) {
            const unpatchedModules: string[] = this.noPatchModules.split(",");
            // Convert module names not supported by new InstrumentationOptions
            for (let i = 0; i < unpatchedModules.length; i++) {
                if (unpatchedModules[i] === "pg-pool" || unpatchedModules[i] === "pg") {
                    unpatchedModules[i] = "postgresql";
                } else if (unpatchedModules[i] === "mongodb-core") {
                    unpatchedModules[i] = "mongodb";
                } else if (unpatchedModules[i] === "redis") {
                    unpatchedModules.push("redis4")
                }
            }

            // Disable instrumentation for unpatched modules
            for (const mod in options.instrumentationOptions) {
                if (unpatchedModules.indexOf(mod.toLowerCase()) !== -1) {
                    (options.instrumentationOptions as InstrumentationOptionsType)[mod] = { enabled: false };
                }
            }
        }

        if (typeof (this.enableSendLiveMetrics) === "boolean") {
            options.enableLiveMetrics = this.enableSendLiveMetrics;
        }

        // BROWSER SDK LOADER
        if (this.enableWebInstrumentation === true) {
            options.browserSdkLoaderOptions = {
                enabled: this.enableWebInstrumentation,
                connectionString: this.webInstrumentationConnectionString,
            }
        }

        // NOT SUPPORTED CONFIGURATION OPTIONS
        if (
            this.enableAutoCollectExtendedMetrics === true ||
            typeof(this.enableAutoCollectExtendedMetrics) === "object" && Object.keys(this.enableAutoCollectExtendedMetrics).length > 0 ||
            typeof(this.disableAllExtendedMetrics) === "boolean" ||
            process.env[ENV_nativeMetricsDisableAll] ||
            process.env[ENV_nativeMetricsDisablers] ||
            this.extendedMetricDisablers
        ) {
            this._configWarnings.push(`Extended metrics are no longer supported. ${UNSUPPORTED_MSG}`);
        }
        if (this.disableAppInsights) {
            this._configWarnings.push(`disableAppInsights configuration no longer supported. ${UNSUPPORTED_MSG}`);
        }
        if (this.enableAutoCollectHeartbeat === true) {
            this._configWarnings.push(`Heartbeat metrics are no longer supported. ${UNSUPPORTED_MSG}`);
        }
        if (this.enableAutoDependencyCorrelation === false) {
            this._configWarnings.push(`Auto dependency correlation cannot be turned off anymore. ${UNSUPPORTED_MSG}`);
        }
        if (typeof (this.enableAutoCollectIncomingRequestAzureFunctions) === "boolean") {
            this._configWarnings.push(`Auto request generation in Azure Functions is no longer supported. ${UNSUPPORTED_MSG}`);
        }
        if (this.enableUseAsyncHooks === false) {
            this._configWarnings.push(`The use of non async hooks is no longer supported. ${UNSUPPORTED_MSG}`);
        }
        if (this.distributedTracingMode === DistributedTracingModes.AI) {
            this._configWarnings.push(`AI only distributed tracing mode is no longer supported. ${UNSUPPORTED_MSG}`);
        }
        if (this.enableResendInterval) {
            this._configWarnings.push(`The resendInterval configuration option is not supported by the shim. ${UNSUPPORTED_MSG}`);
        }
        if (this.enableMaxBytesOnDisk) {
            this._configWarnings.push(`The maxBytesOnDisk configuration option is not supported by the shim. ${UNSUPPORTED_MSG}`);
        }
        if (this.ignoreLegacyHeaders === false) {
            this._configWarnings.push(`LegacyHeaders are not supported by the shim. ${UNSUPPORTED_MSG}`);
        }
        if (this.maxBatchSize) {
            this._configWarnings.push(`The maxBatchSize configuration option is not supported by the shim. ${UNSUPPORTED_MSG}`);
        }
        if (this.enableLoggerErrorToTrace) {
            this._configWarnings.push(`The enableLoggerErrorToTrace configuration option is not supported by the shim. ${UNSUPPORTED_MSG}`);
        }
        if (this.httpAgent || this.httpsAgent) {
            this._configWarnings.push(`The httpAgent and httpsAgent configuration options are not supported by the shim. ${UNSUPPORTED_MSG}`);
        }
        if (
            this.webInstrumentationConfig || this.webInstrumentationSrc
        ) {
            this._configWarnings.push(`The webInstrumentation config and src options are not supported by the shim. ${UNSUPPORTED_MSG}`);
        }
        if (this.quickPulseHost) {
            this._configWarnings.push(`The quickPulseHost configuration option is not supported by the shim. ${UNSUPPORTED_MSG}`);
        }
        if (this.correlationHeaderExcludedDomains) {
            this._configWarnings.push(`The correlationHeaderExcludedDomains configuration option is not supported by the shim. ${UNSUPPORTED_MSG}`);
        }
        if (
            process.env[ENV_iKey] ||
            process.env[legacy_ENV_iKey] ||
            process.env[ENV_azurePrefix + ENV_iKey] ||
            process.env[ENV_azurePrefix + legacy_ENV_iKey]
        ) {
            this._configWarnings.push(`The iKey configuration option is not supported by the shim. Please configure the the connection string instead. ${UNSUPPORTED_MSG}`);
        }
        if (process.env[ENV_profileQueryEndpoint]) {
            this._configWarnings.push(`The profileQueryEndpoint configuration option is not supported by the shim. ${UNSUPPORTED_MSG}`);
        }
        if (process.env[ENV_quickPulseHost]) {
            this._configWarnings.push(`Please configure the quickPulseHost in the connection string instead. ${UNSUPPORTED_MSG}`);
        }
        return options;
    }
}

export = Config;