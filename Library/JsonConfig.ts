import fs = require("fs");
import path = require("path");

import Logging = require('./Logging');
import { IConfig, IJsonConfig } from "../Declarations/Interfaces";
import { DistributedTracingModes } from "../applicationinsights";
import { IDisabledExtendedMetrics } from "../AutoCollection/NativePerformance";
import FileSystemHelper = require("../Library/FileSystemHelper");

const APPLICATION_INSIGHTS_CONFIG_PATH = "APPLICATION_INSIGHTS_CONFIG_PATH";
// Azure Connection String
const ENV_connectionString = "APPLICATIONINSIGHTS_CONNECTION_STRING";
// Native Metrics Opt Outs
const ENV_nativeMetricsDisablers = "APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC";
const ENV_nativeMetricsDisableAll = "APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS"
const ENV_http_proxy = "http_proxy";
const ENV_https_proxy = "https_proxy";
const ENV_noDiagnosticChannel = "APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL"
const ENV_noStatsbeat = "APPLICATION_INSIGHTS_NO_STATSBEAT";
const ENV_noHttpAgentKeepAlive = "APPLICATION_INSIGHTS_NO_HTTP_AGENT_KEEP_ALIVE";
const ENV_noPatchModules = "APPLICATION_INSIGHTS_NO_PATCH_MODULES";

export class JsonConfig implements IJsonConfig {
    private static _instance: JsonConfig;

    public connectionString: string;
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
    public enableAutoCollectExceptions: boolean;
    public enableAutoCollectPerformance: boolean;
    public enableAutoCollectExtendedMetrics: boolean | IDisabledExtendedMetrics;
    public enableAutoCollectPreAggregatedMetrics: boolean;
    public enableAutoCollectHeartbeat: boolean;
    public enableAutoCollectRequests: boolean;
    public enableAutoCollectDependencies: boolean;
    public enableAutoDependencyCorrelation: boolean;
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


    static getInstance() {
        if (!JsonConfig._instance) {
            JsonConfig._instance = new JsonConfig();
        }
        return JsonConfig._instance;
    }

    constructor() {
        // Load env variables first
        this.connectionString = process.env[ENV_connectionString];
        this.disableAllExtendedMetrics = !!process.env[ENV_nativeMetricsDisableAll];
        this.extendedMetricDisablers = process.env[ENV_nativeMetricsDisablers];
        this.proxyHttpUrl = process.env[ENV_http_proxy];
        this.proxyHttpsUrl = process.env[ENV_https_proxy];
        this.noDiagnosticChannel = !!process.env[ENV_noDiagnosticChannel];
        this.disableStatsbeat = !!process.env[ENV_noStatsbeat];
        this.noHttpAgentKeepAlive = !!process.env[ENV_noHttpAgentKeepAlive];
        this.noPatchModules = process.env[ENV_noPatchModules] || "";
        this._loadJsonFile();
    }

    private _loadJsonFile() {
        let configFilePath = process.env[APPLICATION_INSIGHTS_CONFIG_PATH];
        if (configFilePath) { // Only read config when path is specified
            let tempDir = "";
            if (path.isAbsolute(configFilePath)) {
                tempDir = configFilePath;
            }
            else {
                tempDir = path.join(process.cwd(), configFilePath);
            }
            try {
                const jsonConfig = JSON.parse(fs.readFileSync(tempDir, "utf8"));
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
                this.connectionString = jsonConfig.connectionString || this.connectionString;
                this.extendedMetricDisablers = jsonConfig.extendedMetricDisablers || this.extendedMetricDisablers;
                this.noDiagnosticChannel = jsonConfig.noDiagnosticChannel || this.noDiagnosticChannel;
                this.noHttpAgentKeepAlive = jsonConfig.noHttpAgentKeepAlive || this.noHttpAgentKeepAlive;
                this.proxyHttpUrl = jsonConfig.proxyHttpUrl || this.proxyHttpUrl;
                this.proxyHttpsUrl = jsonConfig.proxyHttpsUrl || this.proxyHttpsUrl;
                this.noPatchModules = jsonConfig.noPatchModules || this.noPatchModules;
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
                this.enableAutoCollectExceptions = jsonConfig.enableAutoCollectExceptions;
                this.enableAutoCollectPerformance = jsonConfig.enableAutoCollectPerformance;
                this.enableAutoCollectExtendedMetrics = jsonConfig.enableAutoCollectExtendedMetrics;
                this.enableAutoCollectPreAggregatedMetrics = jsonConfig.enableAutoCollectPreAggregatedMetrics;
                this.enableAutoCollectHeartbeat = jsonConfig.enableAutoCollectHeartbeat;
                this.enableAutoCollectRequests = jsonConfig.enableAutoCollectRequests;
                this.enableAutoCollectDependencies = jsonConfig.enableAutoCollectDependencies;
                this.enableAutoDependencyCorrelation = jsonConfig.enableAutoDependencyCorrelation;
                this.enableUseAsyncHooks = jsonConfig.enableUseAsyncHooks;
                this.enableUseDiskRetryCaching = jsonConfig.enableUseDiskRetryCaching;
                this.enableResendInterval = jsonConfig.enableResendInterval;
                this.enableMaxBytesOnDisk = jsonConfig.enableMaxBytesOnDisk;
                this.enableInternalDebugLogging = jsonConfig.enableInternalDebugLogging;
                this.enableInternalWarningLogging = jsonConfig.enableInternalWarningLogging;
                this.enableSendLiveMetrics = jsonConfig.enableSendLiveMetrics;
            }
            catch (err) {
                Logging.warn("Error using JSON config file: ", err);
            }
        }
    }
}
