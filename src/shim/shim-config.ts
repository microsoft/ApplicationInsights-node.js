// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.
import http = require("http");
import https = require("https");
import azureCoreAuth = require("@azure/core-auth");
import { DiagLogLevel } from "@opentelemetry/api";
import { HttpInstrumentationConfig } from "@opentelemetry/instrumentation-http";
import { DistributedTracingModes, IConfig, IDisabledExtendedMetrics, IWebInstrumentationConfig } from "./types";
import { Logger } from "../shared/logging";
import { ShimJsonConfig } from "./shim-jsonConfig";
import { AzureMonitorOpenTelemetryOptions, ExtendedMetricType, InstrumentationOptionsType } from "../types";

class Config implements IConfig {

    public static ENV_azurePrefix = "APPSETTING_"; // Azure adds this prefix to all environment variables
    public static ENV_iKey = "APPINSIGHTS_INSTRUMENTATIONKEY"; // This key is provided in the readme
    public static legacy_ENV_iKey = "APPINSIGHTS_INSTRUMENTATION_KEY";
    public static ENV_profileQueryEndpoint = "APPINSIGHTS_PROFILE_QUERY_ENDPOINT";
    public static ENV_quickPulseHost = "APPINSIGHTS_QUICKPULSE_HOST";

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


    /**
   * Creates a new Config instance
   * @param setupString Connection String, instrumentationKey is no longer supported here
   */
    constructor(setupString?: string) {
        // Load config values from env variables and JSON if available
        this._mergeConfig();

        this.connectionString = setupString;
        // this.enableWebInstrumentation = this.enableWebInstrumentation || this.enableAutoWebSnippetInjection || false;
        this.webInstrumentationConfig = this.webInstrumentationConfig || null;
        // this.enableAutoWebSnippetInjection = this.enableWebInstrumentation;
        this.correlationHeaderExcludedDomains =
            this.correlationHeaderExcludedDomains ||
            ShimJsonConfig.getInstance().correlationHeaderExcludedDomains ||
            [
                "*.core.windows.net",
                "*.core.chinacloudapi.cn",
                "*.core.cloudapi.de",
                "*.core.usgovcloudapi.net",
                "*.core.microsoft.scloud",
                "*.core.eaglex.ic.gov"
            ];

        this.ignoreLegacyHeaders = true;
        this.webInstrumentationConnectionString = this.webInstrumentationConnectionString || "";
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
            },
            logInstrumentationOptions: {
                console: { enabled: false },
                winston: { enabled: true },
                bunyan: { enabled: true }
            },
            otlpTraceExporterConfig: {},
            otlpMetricExporterConfig: {},
            otlpLogExporterConfig: {},
            extendedMetrics: {},
        };
        if (this.samplingPercentage) {
            options.samplingRatio = this.samplingPercentage / 100;
        }
        options.instrumentationOptions = {
            ...options.instrumentationOptions,
            http: {
                ...options.instrumentationOptions?.http,
                ignoreOutgoingUrls: this.correlationHeaderExcludedDomains,
            } as HttpInstrumentationConfig,
        }
        if (this.aadTokenCredential) {
            options.azureMonitorExporterOptions.credential = this.aadTokenCredential;
        }
        if (typeof (this.enableAutoCollectConsole) === "boolean") {
            const setting: boolean = this.enableAutoCollectConsole;
            options.logInstrumentationOptions = {
                ...options.logInstrumentationOptions,
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
            options.logInstrumentationOptions = {
                ...options.logInstrumentationOptions,
                winston: { enabled: this.enableAutoCollectExternalLoggers },
                bunyan: { enabled: this.enableAutoCollectExternalLoggers },
            }
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
                Logger.getInstance().warn("failed to parse proxy URL.");
            }
        }
        if (this.maxBatchIntervalMs) {
            options.otlpTraceExporterConfig = { ...options.otlpTraceExporterConfig, timeoutMillis: this.maxBatchIntervalMs };
            options.otlpMetricExporterConfig = { ...options.otlpMetricExporterConfig, timeoutMillis: this.maxBatchIntervalMs };
            options.otlpLogExporterConfig = { ...options.otlpLogExporterConfig, timeoutMillis: this.maxBatchIntervalMs };
        }
        if (typeof (this.enableInternalDebugLogging) === "boolean") {
            Logger.getInstance().updateLogLevel(DiagLogLevel.DEBUG);
        }
        if (typeof (this.enableInternalWarningLogging) === "boolean") {
            Logger.getInstance().updateLogLevel(DiagLogLevel.WARN);
        }
        if (this.enableAutoCollectPreAggregatedMetrics === false) {
            process.env["APPLICATION_INSIGHTS_NO_STANDARD_METRICS"] = "disable";
        }
        // NATIVE METRICS
        if (typeof (this.enableAutoCollectExtendedMetrics) === "boolean") {
            options.extendedMetrics = {
                [ExtendedMetricType.gc]: this.enableAutoCollectExtendedMetrics,
                [ExtendedMetricType.heap]: this.enableAutoCollectExtendedMetrics,
                [ExtendedMetricType.loop]: this.enableAutoCollectExtendedMetrics,
            };
        }
        // Disable specific native metrics if provided
        if (this.extendedMetricDisablers) {
            const extendedMetricDisablers: string[] = this.extendedMetricDisablers.split(",");
            for (const extendedMetricDisabler of extendedMetricDisablers) {
                if (extendedMetricDisabler === "gc") {
                    options.extendedMetrics = {
                        ...options.extendedMetrics,
                        [ExtendedMetricType.gc]: false
                    };
                }
                if (extendedMetricDisabler === "heap") {
                    options.extendedMetrics = {
                        ...options.extendedMetrics,
                        [ExtendedMetricType.heap]: false
                    };
                }
                if (extendedMetricDisabler === "loop") {
                    options.extendedMetrics = {
                        ...options.extendedMetrics,
                        [ExtendedMetricType.loop]: false
                    };
                }
            }
        }
        // Disable all native metrics
        if (this.disableAllExtendedMetrics === true) {
            options.extendedMetrics = {
                ...options.extendedMetrics,
                [ExtendedMetricType.gc]: false,
                [ExtendedMetricType.heap]: false,
                [ExtendedMetricType.loop]: false,
            };
        }

        if (this.noDiagnosticChannel === true) {
            // Disable all instrumentations except http to conform with AppInsights 2.x behavior
            for (const mod in options.instrumentationOptions) {
                if (mod !== "http") {
                    (options.instrumentationOptions as InstrumentationOptionsType)[mod] = { enabled: false };
                }
            }
            for (const mod in options.logInstrumentationOptions) {
                (options.logInstrumentationOptions as InstrumentationOptionsType)[mod] = { enabled: false };
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
            for (const mod in options.logInstrumentationOptions) {
                if (unpatchedModules.indexOf(mod.toLowerCase()) !== -1) {
                    (options.logInstrumentationOptions as InstrumentationOptionsType)[mod] = { enabled: false };
                }
            }
        }

        // NOT SUPPORTED CONFIGURATION OPTIONS
        if (this.disableAppInsights) {
            Logger.getInstance().warn("disableAppInsights configuration no longer supported.");
        }
        if (this.enableAutoCollectHeartbeat) {
            Logger.getInstance().warn("Heartbeat metris are no longer supported.");
        }
        if (this.enableAutoDependencyCorrelation === false) {
            Logger.getInstance().warn("Auto dependency correlation cannot be turned off anymore.");
        }
        if (typeof (this.enableAutoCollectIncomingRequestAzureFunctions) === "boolean") {
            Logger.getInstance().warn("Auto request generation in Azure Functions is no longer supported.");
        }
        if (typeof (this.enableSendLiveMetrics) === "boolean") {
            Logger.getInstance().warn("Live Metrics is currently not supported.");
        }
        if (this.enableUseAsyncHooks === false) {
            Logger.getInstance().warn("The use of non async hooks is no longer supported.");
        }
        if (this.distributedTracingMode === DistributedTracingModes.AI) {
            Logger.getInstance().warn("AI only distributed tracing mode is no longer supported.");
        }
        if (this.enableResendInterval) {
            Logger.getInstance().warn("The resendInterval configuration option is not supported by the shim.");
        }
        if (this.enableMaxBytesOnDisk) {
            Logger.getInstance().warn("The maxBytesOnDisk configuration option is not supported by the shim.");
        }
        if (this.ignoreLegacyHeaders === false) {
            Logger.getInstance().warn("LegacyHeaders are not supported by the shim.");
        }

        if (this.maxBatchSize) {
            Logger.getInstance().warn("The maxBatchSize configuration option is not supported by the shim.");
        }
        if (this.enableLoggerErrorToTrace) {
            Logger.getInstance().warn("The enableLoggerErrorToTrace configuration option is not supported by the shim.");
        }
        if (this.httpAgent || this.httpsAgent) {
            Logger.getInstance().warn("The httpAgent and httpsAgent configuration options are not supported by the shim.");
        }
        if (
            this.enableWebInstrumentation || this.webInstrumentationConfig || this.webInstrumentationSrc || this.webInstrumentationConnectionString
        ) {
            Logger.getInstance().warn("The webInstrumentation configuration options are not supported by the shim.");
        }
        return options;
    }
}

export = Config;