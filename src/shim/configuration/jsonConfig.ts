import * as fs from "fs";
import * as path from "path";
import { Logger } from "../logging";
import { ApplicationInsightsOptions, LogInstrumentationsConfig } from "../../types";
import { DistributedTracingModes, IDisabledExtendedMetrics, IJsonConfig } from "../types";
import * as http from "http";
import * as https from "https";
import azureCoreAuth = require("@azure/core-auth");

const ENV_CONFIGURATION_FILE = "APPLICATIONINSIGHTS_CONFIGURATION_FILE";
const ENV_CONTENT = "APPLICATIONINSIGHTS_CONFIGURATION_CONTENT";

// Shim environment variables
const ENV_connectionString = "APPLICATIONINSIGHTS_CONNECTION_STRING";
const ENV_azurePrefix = "APPSETTING_"; // Azure adds this prefix to all environment variables
const ENV_instrumentationKey = "APPINSIGHTS_INSTRUMENTATIONKEY";
const ENV_legacyInstrumentationKey = "APPINSIGHTS_INSTRUMENTATION_KEY"
const ENV_nativeMetricsDisablers = "APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC";
const ENV_nativeMetricsDisableAll = "APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS";
const ENV_http_proxy = "http_proxy";
const ENV_https_proxy = "https_proxy";
const ENV_noDiagnosticChannel = "APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL";
const ENV_noStatsbeat = "APPLICATION_INSIGHTS_NO_STATSBEAT";
const ENV_noHttpAgentKeepAlive = "APPLICATION_INSIGHTS_NO_HTTP_AGENT_KEEP_ALIVE";
const ENV_noPatchModules = "APPLICATION_INSIGHTS_NO_PATCH_MODULES";

export class JsonConfig implements IJsonConfig, ApplicationInsightsOptions {
    private static _instance: JsonConfig;

    // Shim values
    public endpointUrl: string;
    public connectionString: string;
    public instrumentationKey: string;
    public disableAllExtendedMetrics: boolean;
    public extendedMetricDisablers: string;
    public proxyHttpUrl: string;
    public proxyHttpsUrl: string;
    public noDiagnosticChannel: boolean;
    public disableStatsbeat: boolean;
    public noHttpAgentKeepAlive: boolean;
    public noPatchModules: string;
    public maxBatchSize: number;
    public maxBatchIntervalMs: number;
    public disableAppInsights: boolean;
    public samplingPercentage: number;
    public correlationIdRetryIntervalMs: number;
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

    // Distro values
    public enableAutoCollectExceptions: boolean;
    public logInstrumentations: LogInstrumentationsConfig;
    public extendedMetrics: { [type: string]: boolean };

    public static getInstance() {
        if (!JsonConfig._instance) {
            JsonConfig._instance = new JsonConfig();
        }
        return JsonConfig._instance;
    }

    constructor() {
        // Load environment variables first
        this.connectionString = process.env[ENV_connectionString];
        this.instrumentationKey = process.env[ENV_instrumentationKey]
            || process.env[ENV_azurePrefix + ENV_instrumentationKey]
            || process.env[ENV_legacyInstrumentationKey]
            || process.env[ENV_azurePrefix + ENV_legacyInstrumentationKey];
        this._loadJsonFile();
        if (!this.connectionString && this.instrumentationKey) {
            Logger.getInstance().warn("APPINSIGHTS_INSTRUMENTATIONKEY is in path of deprecation, please use APPLICATIONINSIGHTS_CONNECTION_STRING env variable to setup the SDK.");
        }
        this.disableAllExtendedMetrics = !!process.env[ENV_nativeMetricsDisableAll];
        this.extendedMetricDisablers = process.env[ENV_nativeMetricsDisablers];
        this.proxyHttpUrl = process.env[ENV_http_proxy];
        this.proxyHttpsUrl = process.env[ENV_https_proxy];
        this.noDiagnosticChannel = !!process.env[ENV_noDiagnosticChannel];
        this.disableStatsbeat = !!process.env[ENV_noStatsbeat];
        this.noHttpAgentKeepAlive = !!process.env[ENV_noHttpAgentKeepAlive];
        this.noPatchModules = process.env[ENV_noPatchModules] || "";
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
            const jsonConfig: ApplicationInsightsOptions & IJsonConfig = JSON.parse(jsonString);
            this.enableAutoCollectExceptions = jsonConfig.enableAutoCollectExceptions;
            this.logInstrumentations = jsonConfig?.logInstrumentations ? jsonConfig?.logInstrumentations : {};
            this.extendedMetrics = jsonConfig.extendedMetrics;

            // Shim values supported
            this.instrumentationKey = jsonConfig.instrumentationKey;
            this.endpointUrl = jsonConfig.endpointUrl;
            this.samplingPercentage = jsonConfig.samplingPercentage;
            this.enableAutoCollectExternalLoggers = jsonConfig.enableAutoCollectExternalLoggers;
            this.enableAutoCollectConsole = jsonConfig.enableAutoCollectConsole;
            this.enableLoggerErrorToTrace = jsonConfig.enableLoggerErrorToTrace;
            this.enableAutoCollectExceptions = jsonConfig.enableAutoCollectExceptions;
            this.enableAutoCollectPerformance = jsonConfig.enableAutoCollectPerformance;

            // Shim values not supported
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
        } catch (err) {
            Logger.getInstance().info("Missing or invalid JSON config file: ", err);
        }
    }
}
