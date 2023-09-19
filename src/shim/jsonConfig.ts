import * as fs from "fs";
import * as path from "path";
import { Logger } from "../shared/logging/logger";
import { DistributedTracingModes, IDisabledExtendedMetrics, IJsonConfig, IWebInstrumentationConfig } from "./types";
import * as http from "http";
import * as https from "https";
import * as azureCoreAuth from "@azure/core-auth";

const ENV_CONFIGURATION_FILE = "APPLICATIONINSIGHTS_CONFIGURATION_FILE";
const ENV_CONTENT = "APPLICATIONINSIGHTS_CONFIGURATION_CONTENT";
const ENV_connectionString = "APPLICATIONINSIGHTS_CONNECTION_STRING";
const ENV_nativeMetricsDisablers = "APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC";
const ENV_nativeMetricsDisableAll = "APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS";
const ENV_http_proxy = "http_proxy";
const ENV_https_proxy = "https_proxy";
const ENV_noDiagnosticChannel = "APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL";
const ENV_noHttpAgentKeepAlive = "APPLICATION_INSIGHTS_NO_HTTP_AGENT_KEEP_ALIVE"; // TODO: Add support for this setting, http agent configurable in Azure SDK?
const ENV_noPatchModules = "APPLICATION_INSIGHTS_NO_PATCH_MODULES";
const ENV_webInstrumentationEnable = "APPLICATIONINSIGHTS_WEB_INSTRUMENTATION_ENABLED";
const ENV_webInstrumentation_connectionString = "APPLICATIONINSIGHTS_WEB_INSTRUMENTATION_CONNECTION_STRING";
const ENV_webInstrumentation_source = "APPLICATIONINSIGHTS_WEB_INSTRUMENTATION_SOURCE";

export class ShimJsonConfig implements IJsonConfig {
    private static _instance: ShimJsonConfig;

    public endpointUrl: string;
    public connectionString: string;
    public disableAllExtendedMetrics: boolean;
    public extendedMetricDisablers: string;
    public proxyHttpUrl: string;
    public proxyHttpsUrl: string;
    public noDiagnosticChannel: boolean;
    public noHttpAgentKeepAlive: boolean;
    public noPatchModules: string;
    public maxBatchSize: number;
    public maxBatchIntervalMs: number;
    public disableAppInsights: boolean;
    public samplingPercentage: number;
    public correlationHeaderExcludedDomains: string[];
    public httpAgent: http.Agent;
    public httpsAgent: https.Agent;
    public ignoreLegacyHeaders: boolean;
    public aadTokenCredential?: azureCoreAuth.TokenCredential;
    public enableAutoCollectConsole: boolean;
    public enableLoggerErrorToTrace: boolean;
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
    public quickPulseHost: string;
    public enableWebInstrumentation: boolean;
    public enableAutoCollectExceptions: boolean;
    public webInstrumentationConnectionString?: string;
    public webInstrumentationConfig: IWebInstrumentationConfig[];
    public webInstrumentationSrc: string;

    public static getInstance() {
        if (!ShimJsonConfig._instance) {
            ShimJsonConfig._instance = new ShimJsonConfig();
        }
        return ShimJsonConfig._instance;
    }

    constructor() {
        // Load environment variables first
        this.connectionString = process.env[ENV_connectionString];
        this.disableAllExtendedMetrics = !!process.env[ENV_nativeMetricsDisableAll];
        this.extendedMetricDisablers = process.env[ENV_nativeMetricsDisablers];
        this.proxyHttpUrl = process.env[ENV_http_proxy];
        this.proxyHttpsUrl = process.env[ENV_https_proxy];
        this.noDiagnosticChannel = !!process.env[ENV_noDiagnosticChannel];
        this.noHttpAgentKeepAlive = !!process.env[ENV_noHttpAgentKeepAlive];
        this.noPatchModules = process.env[ENV_noPatchModules] || "";
        this.enableWebInstrumentation = !!process.env[ENV_webInstrumentationEnable];
        this.webInstrumentationSrc = process.env[ENV_webInstrumentation_source] || "";
        this.webInstrumentationConnectionString = process.env[ENV_webInstrumentation_connectionString] || "";

        this._loadJsonFile();
    }

    private _loadJsonFile() {
        let jsonString = "";
        const contentJsonConfig = process.env[ENV_CONTENT];
        // JSON string added directly in env variable
        if (contentJsonConfig) {
            jsonString = contentJsonConfig;
        }
        // JSON file
        else {
            const configFileName = "applicationinsights.json";
            const rootPath = path.join(__dirname, "../../../../"); // Root of folder (__dirname = ../dist-esm/src)
            let tempDir = path.join(rootPath, configFileName); // default
            const configFile = process.env[ENV_CONFIGURATION_FILE];
            if (configFile) {
                if (path.isAbsolute(configFile)) {
                    tempDir = configFile;
                } else {
                    tempDir = path.join(rootPath, configFile); // Relative path to applicationinsights folder
                }
            }
            try {
                jsonString = fs.readFileSync(tempDir, "utf8");
            } catch (err) {
                Logger.getInstance().info("Failed to read JSON config file: ", err);
            }
        }
        try {
            const jsonConfig: IJsonConfig = JSON.parse(jsonString);
            this.connectionString = jsonConfig.connectionString;
            this.enableAutoCollectExceptions = jsonConfig.enableAutoCollectExceptions;
            this.endpointUrl = jsonConfig.endpointUrl;
            this.samplingPercentage = jsonConfig.samplingPercentage;
            this.enableAutoCollectExternalLoggers = jsonConfig.enableAutoCollectExternalLoggers;
            this.enableAutoCollectConsole = jsonConfig.enableAutoCollectConsole;
            this.enableLoggerErrorToTrace = jsonConfig.enableLoggerErrorToTrace;
            this.enableAutoCollectExceptions = jsonConfig.enableAutoCollectExceptions;
            this.enableAutoCollectPerformance = jsonConfig.enableAutoCollectPerformance;
            this.enableAutoCollectPreAggregatedMetrics = jsonConfig.enableAutoCollectPreAggregatedMetrics;
            this.enableAutoDependencyCorrelation = jsonConfig.enableAutoDependencyCorrelation;
            this.maxBatchSize = jsonConfig.maxBatchSize;
            this.maxBatchIntervalMs = jsonConfig.maxBatchIntervalMs;
            this.disableAppInsights = jsonConfig.disableAppInsights;
            this.correlationHeaderExcludedDomains = jsonConfig.correlationHeaderExcludedDomains;
            this.ignoreLegacyHeaders = jsonConfig.ignoreLegacyHeaders;
            this.distributedTracingMode = jsonConfig.distributedTracingMode;
            this.enableAutoCollectExtendedMetrics = jsonConfig.enableAutoCollectExtendedMetrics;
            this.enableAutoCollectHeartbeat = jsonConfig.enableAutoCollectHeartbeat;
            this.enableAutoCollectRequests = jsonConfig.enableAutoCollectRequests;
            this.enableAutoCollectDependencies = jsonConfig.enableAutoCollectDependencies;
            this.enableAutoCollectIncomingRequestAzureFunctions = jsonConfig.enableAutoCollectIncomingRequestAzureFunctions;
            this.enableUseAsyncHooks = jsonConfig.enableUseAsyncHooks;
            this.enableUseDiskRetryCaching = jsonConfig.enableUseDiskRetryCaching;
            this.enableResendInterval = jsonConfig.enableResendInterval;
            this.enableMaxBytesOnDisk = jsonConfig.enableMaxBytesOnDisk;
            this.enableInternalDebugLogging = jsonConfig.enableInternalDebugLogging;
            this.enableInternalWarningLogging = jsonConfig.enableInternalWarningLogging;
            this.enableSendLiveMetrics = jsonConfig.enableSendLiveMetrics;
            this.disableAllExtendedMetrics = jsonConfig.disableAllExtendedMetrics;
            this.extendedMetricDisablers = jsonConfig.extendedMetricDisablers;
            this.noDiagnosticChannel = jsonConfig.noDiagnosticChannel;
            this.noPatchModules = jsonConfig.noPatchModules;
            this.noHttpAgentKeepAlive = jsonConfig.noHttpAgentKeepAlive;
            this.proxyHttpUrl = jsonConfig.proxyHttpUrl;
            this.proxyHttpsUrl = jsonConfig.proxyHttpsUrl;
            this.webInstrumentationConnectionString = jsonConfig.webInstrumentationConnectionString;
            this.webInstrumentationConfig = jsonConfig.webInstrumentationConfig;
            this.webInstrumentationSrc = jsonConfig.webInstrumentationSrc;
            this.quickPulseHost = jsonConfig.quickPulseHost;
            this.enableWebInstrumentation = jsonConfig.enableWebInstrumentation;
        } catch (err) {
            Logger.getInstance().info("Missing or invalid JSON config file: ", err);
        }
    }
}