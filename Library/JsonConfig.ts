import fs = require("fs");
import path = require("path");

import Logging = require("./Logging");
import { IJsonConfig } from "../Declarations/Interfaces";
import { DistributedTracingModes } from "../applicationinsights";
import { IDisabledExtendedMetrics } from "../AutoCollection/NativePerformance";

const ENV_CONFIGURATION_FILE = "APPLICATIONINSIGHTS_CONFIGURATION_FILE";
// Azure Connection String
const ENV_connectionString = "APPLICATIONINSIGHTS_CONNECTION_STRING";
// Instrumentation Key
const ENV_azurePrefix = "APPSETTING_"; // Azure adds this prefix to all environment variables
const ENV_instrumentationKey = "APPINSIGHTS_INSTRUMENTATIONKEY";
const ENV_legacyInstrumentationKey = "APPINSIGHTS_INSTRUMENTATION_KEY"
// Native Metrics Opt Outs
const ENV_nativeMetricsDisablers = "APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC";
const ENV_nativeMetricsDisableAll = "APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS"
const ENV_http_proxy = "http_proxy";
const ENV_https_proxy = "https_proxy";
const ENV_noDiagnosticChannel = "APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL"
const ENV_noStatsbeat = "APPLICATION_INSIGHTS_NO_STATSBEAT";
const ENV_noHttpAgentKeepAlive = "APPLICATION_INSIGHTS_NO_HTTP_AGENT_KEEP_ALIVE";
const ENV_noPatchModules = "APPLICATION_INSIGHTS_NO_PATCH_MODULES";
const ENV_webInstrumentationEnable = "APPLICATIONINSIGHTS_WEB_INSTRUMENTATION_ENABLED";
const ENV_webInstrumentation_connectionString = "APPLICATIONINSIGHTS_WEB_INSTRUMENTATION_CONNECTION_STRING";
const ENV_webInstrumentation_source = "APPLICATIONINSIGHTS_WEB_INSTRUMENTATION_SOURCE";

// Old web instrumentation env variables are to be deprecated
// Those env variables will NOT be exposed in doc after version 2.3.5
const ENV_webSnippetEnable = "APPLICATIONINSIGHTS_WEB_SNIPPET_ENABLED";
const ENV_webSnippet_connectionString = "APPLICATIONINSIGHTS_WEB_SNIPPET_CONNECTION_STRING";

export class JsonConfig implements IJsonConfig {
    private static _instance: JsonConfig;

    public connectionString: string;
    public instrumentationKey: string;
    public endpointUrl: string;
    public maxBatchSize: number;
    public maxBatchIntervalMs: number;
    public disableAppInsights: boolean;
    public samplingPercentage: number;
    public correlationIdRetryIntervalMs: number;
    public correlationHeaderExcludedDomains: string[];
    public proxyHttpUrl: string;
    public proxyHttpsUrl: string;
    public ignoreLegacyHeaders: boolean;
    public distributedTracingMode: DistributedTracingModes;
    public enableAutoCollectExternalLoggers: boolean;
    public enableAutoCollectConsole: boolean;
    public enableConsoleErrorToTrace: boolean;
    public enableAutoCollectExceptions: boolean;
    public enableAutoCollectPerformance: boolean;
    public enableAutoCollectExtendedMetrics: boolean | IDisabledExtendedMetrics;
    public enableAutoCollectPreAggregatedMetrics: boolean;
    public enableAutoCollectHeartbeat: boolean;
    public enableAutoCollectRequests: boolean;
    public enableAutoCollectDependencies: boolean;
    public enableAutoDependencyCorrelation: boolean;
    public enableAutoCollectIncomingRequestAzureFunctions: boolean;
    public enableUseAsyncHooks: boolean;
    public enableUseDiskRetryCaching: boolean;
    public enableResendInterval: number;
    public enableMaxBytesOnDisk: number;
    public enableInternalDebugLogging: boolean;
    public enableInternalWarningLogging: boolean;
    public enableSendLiveMetrics: boolean;
    public disableAllExtendedMetrics: boolean;
    public extendedMetricDisablers: string;
    public disableStatsbeat: boolean;
    public noDiagnosticChannel: boolean;
    public noPatchModules: string;
    public noHttpAgentKeepAlive: boolean;
    public quickPulseHost: string;
    public enableWebInstrumentation: boolean;
    public webInstrumentationConnectionString: string;
    public webInstrumentationConfig: any;
    public webInstrumentationSrc: string;

    // the following features are to be deprecated
    // Those env variables will NOT be exposed in doc after version 2.3.5
    public enableAutoWebSnippetInjection: boolean;
    public webSnippetConnectionString: string;

    static getInstance() {
        if (!JsonConfig._instance) {
            JsonConfig._instance = new JsonConfig();
        }
        return JsonConfig._instance;
    }

    constructor() {
        // Load env variables first
        this.connectionString = process.env[ENV_connectionString];
        this.instrumentationKey = process.env[ENV_instrumentationKey]
            || process.env[ENV_azurePrefix + ENV_instrumentationKey]
            || process.env[ENV_legacyInstrumentationKey]
            || process.env[ENV_azurePrefix + ENV_legacyInstrumentationKey];

        if (!this.connectionString && this.instrumentationKey) {
            Logging.warn("APPINSIGHTS_INSTRUMENTATIONKEY is in path of deprecation, please use APPLICATIONINSIGHTS_CONNECTION_STRING env variable to setup the SDK.");
        }
        this.disableAllExtendedMetrics = !!process.env[ENV_nativeMetricsDisableAll];
        this.extendedMetricDisablers = process.env[ENV_nativeMetricsDisablers];
        this.proxyHttpUrl = process.env[ENV_http_proxy];
        this.proxyHttpsUrl = process.env[ENV_https_proxy];
        this.noDiagnosticChannel = !!process.env[ENV_noDiagnosticChannel];
        this.disableStatsbeat = !!process.env[ENV_noStatsbeat];
        this.noHttpAgentKeepAlive = !!process.env[ENV_noHttpAgentKeepAlive];
        this.noPatchModules = process.env[ENV_noPatchModules] || "";
        this.enableWebInstrumentation = !!process.env[ENV_webInstrumentationEnable] || !!process.env[ENV_webSnippetEnable];
        this.webInstrumentationSrc = process.env[ENV_webInstrumentation_source] || "";
        this.webInstrumentationConnectionString = process.env[ENV_webInstrumentation_connectionString] || process.env[ENV_webSnippet_connectionString] || "";
        this.enableAutoWebSnippetInjection = this.enableWebInstrumentation;
        this.webSnippetConnectionString = this.webInstrumentationConnectionString;
        this._loadJsonFile();
    }

    private _loadJsonFile() {
        let configFileName = "applicationinsights.json";
        let rootPath = path.join(__dirname, "../../"); // Root of applicationinsights folder (__dirname = ../out/Library)
        let tempDir = path.join(rootPath, configFileName); // default
        let configFile = process.env[ENV_CONFIGURATION_FILE];
        if (configFile) {
            if (path.isAbsolute(configFile)) {
                tempDir = configFile;
            }
            else {
                tempDir = path.join(rootPath, configFile);// Relative path to applicationinsights folder
            }
        }
        try {
            const jsonConfig: IJsonConfig = JSON.parse(fs.readFileSync(tempDir, "utf8"));
            if (jsonConfig.disableStatsbeat != undefined) {
                this.disableStatsbeat = jsonConfig.disableStatsbeat;
            }
            if (jsonConfig.disableAllExtendedMetrics != undefined) {
                this.disableAllExtendedMetrics = jsonConfig.disableStatsbeat;
            }
            if (jsonConfig.noDiagnosticChannel != undefined) {
                this.noDiagnosticChannel = jsonConfig.noDiagnosticChannel;
            }
            if (jsonConfig.noHttpAgentKeepAlive != undefined) {
                this.noHttpAgentKeepAlive = jsonConfig.noHttpAgentKeepAlive;
            }
            if (jsonConfig.connectionString != undefined) {
                this.connectionString = jsonConfig.connectionString;
            }
            if (jsonConfig.extendedMetricDisablers != undefined) {
                this.extendedMetricDisablers = jsonConfig.extendedMetricDisablers;
            }
            if (jsonConfig.noDiagnosticChannel != undefined) {
                this.noDiagnosticChannel = jsonConfig.noDiagnosticChannel;
            }
            if (jsonConfig.proxyHttpUrl != undefined) {
                this.proxyHttpUrl = jsonConfig.proxyHttpUrl;
            }
            if (jsonConfig.proxyHttpsUrl != undefined) {
                this.proxyHttpsUrl = jsonConfig.proxyHttpsUrl;
            }
            if (jsonConfig.proxyHttpsUrl != undefined) {
                this.proxyHttpsUrl = jsonConfig.proxyHttpsUrl;
            }
            if (jsonConfig.noPatchModules != undefined) {
                this.noPatchModules = jsonConfig.noPatchModules;
            }
            if (jsonConfig.enableAutoWebSnippetInjection != undefined) {
                this.enableWebInstrumentation = jsonConfig.enableAutoWebSnippetInjection;
                this.enableAutoWebSnippetInjection = this.enableWebInstrumentation;
            }
            if (jsonConfig.enableWebInstrumentation != undefined) {
                this.enableWebInstrumentation = jsonConfig.enableWebInstrumentation;
                this.enableAutoWebSnippetInjection = this.enableWebInstrumentation;
            }
            if (jsonConfig.webSnippetConnectionString != undefined) {
                this.webInstrumentationConnectionString = jsonConfig.webSnippetConnectionString;
                this.webSnippetConnectionString = this.webInstrumentationConnectionString;
            }
            if (jsonConfig.webInstrumentationConnectionString != undefined) {
                this.webInstrumentationConnectionString = jsonConfig.webInstrumentationConnectionString;
                this.webSnippetConnectionString = this.webInstrumentationConnectionString;
            }
            if (jsonConfig.webInstrumentationConfig != undefined) {
                this.webInstrumentationConfig = jsonConfig.webInstrumentationConfig;
            }
            if (jsonConfig.webInstrumentationSrc != undefined) {
                this.webInstrumentationSrc = jsonConfig.webInstrumentationSrc;
            }
            if (jsonConfig.enableConsoleErrorToTrace != undefined) {
                this.enableConsoleErrorToTrace = jsonConfig.enableConsoleErrorToTrace;
            }

            this.endpointUrl = jsonConfig.endpointUrl;
            this.maxBatchSize = jsonConfig.maxBatchSize;
            this.maxBatchIntervalMs = jsonConfig.maxBatchIntervalMs;
            this.disableAppInsights = jsonConfig.disableAppInsights;
            this.samplingPercentage = jsonConfig.samplingPercentage;
            this.correlationIdRetryIntervalMs = jsonConfig.correlationIdRetryIntervalMs;
            this.correlationHeaderExcludedDomains = jsonConfig.correlationHeaderExcludedDomains;
            this.ignoreLegacyHeaders = jsonConfig.ignoreLegacyHeaders;
            this.distributedTracingMode = jsonConfig.distributedTracingMode;
            this.enableAutoCollectExternalLoggers = jsonConfig.enableAutoCollectExternalLoggers;
            this.enableAutoCollectConsole = jsonConfig.enableAutoCollectConsole;
            this.enableConsoleErrorToTrace = jsonConfig.enableConsoleErrorToTrace;
            this.enableAutoCollectExceptions = jsonConfig.enableAutoCollectExceptions;
            this.enableAutoCollectPerformance = jsonConfig.enableAutoCollectPerformance;
            this.enableAutoCollectExtendedMetrics = jsonConfig.enableAutoCollectExtendedMetrics;
            this.enableAutoCollectPreAggregatedMetrics = jsonConfig.enableAutoCollectPreAggregatedMetrics;
            this.enableAutoCollectHeartbeat = jsonConfig.enableAutoCollectHeartbeat;
            this.enableAutoCollectRequests = jsonConfig.enableAutoCollectRequests;
            this.enableAutoCollectDependencies = jsonConfig.enableAutoCollectDependencies;
            this.enableAutoDependencyCorrelation = jsonConfig.enableAutoDependencyCorrelation;
            this.enableAutoCollectIncomingRequestAzureFunctions = jsonConfig.enableAutoCollectIncomingRequestAzureFunctions;
            this.enableUseAsyncHooks = jsonConfig.enableUseAsyncHooks;
            this.enableUseDiskRetryCaching = jsonConfig.enableUseDiskRetryCaching;
            this.enableResendInterval = jsonConfig.enableResendInterval;
            this.enableMaxBytesOnDisk = jsonConfig.enableMaxBytesOnDisk;
            this.enableInternalDebugLogging = jsonConfig.enableInternalDebugLogging;
            this.enableInternalWarningLogging = jsonConfig.enableInternalWarningLogging;
            this.enableSendLiveMetrics = jsonConfig.enableSendLiveMetrics;
            this.quickPulseHost = jsonConfig.quickPulseHost;
        }
        catch (err) {
            Logging.info("Missing or invalid JSON config file: ", err);
        }
    }
}
