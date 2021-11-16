import { IJsonConfig } from "./IJsonConfig";
import Logging = require('./Logging');

import fs = require("fs");
import http = require('http');
import https = require('https');
import { DistributedTracingModes } from "../applicationinsights";
import { IDisabledExtendedMetrics } from "../AutoCollection/NativePerformance";

const APPLICATION_INSIGHTS_CONFIG_PATH = "APPLICATION_INSIGHTS_CONFIG_PATH";

// Azure Connection String
export const ENV_connectionString = "APPLICATIONINSIGHTS_CONNECTION_STRING";
// Native Metrics Opt Outs
export const ENV_nativeMetricsDisablers = "APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC";
export const ENV_nativeMetricsDisableAll = "APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS"
export const ENV_http_proxy = "http_proxy";
export const ENV_https_proxy = "https_proxy";
export const ENV_noDiagnosticChannel = "APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL"
export const ENV_noStatsbeat = "APPLICATION_INSIGHTS_NO_STATSBEAT";
export const ENV_noHttpAgentKeepAlive = "APPLICATION_INSIGHTS_NO_HTTP_AGENT_KEEP_ALIVE";
export const ENV_noPatchModules = "APPLICATION_INSIGHTS_NO_PATCH_MODULES";

export class JsonConfig implements IJsonConfig {
    constructor() {
        this.connectionString = process.env[ENV_connectionString];
        this.disableAllExtendedMetrics = !!process.env[ENV_nativeMetricsDisableAll];
        this.extendedMetricDisablers = process.env[ENV_nativeMetricsDisablers];
        this.proxyHttpUrl = process.env[ENV_http_proxy];
        this.extendedMetricDisablers = process.env[ENV_nativeMetricsDisablers];
        this.proxyHttpsUrl = process.env[ENV_https_proxy];
        this.noDiagnosticChannel = !!process.env[ENV_noDiagnosticChannel];
        this.disableStatsbeat = !!process.env[ENV_noStatsbeat];
        this.noHttpAgentKeepAlive = !!process.env[ENV_noHttpAgentKeepAlive];
        this.noPatchModules = process.env[ENV_noPatchModules] || "";
        try {
            const customConfigObj = JSON.parse(fs.readFileSync(process.env[APPLICATION_INSIGHTS_CONFIG_PATH] || "", "utf8"));
            this.endpointUrl = customConfigObj.endpointUrl;
            this.connectionString = customConfigObj.connectionString || this.connectionString;
            this.maxBatchSize = customConfigObj.maxBatchSize;
            this.maxBatchIntervalMs = customConfigObj.maxBatchIntervalMs;
            this.disableAppInsights = customConfigObj.disableAppInsights;
            this.samplingPercentage = customConfigObj.samplingPercentage;
            this.correlationIdRetryIntervalMs = customConfigObj.correlationIdRetryIntervalMs;
            this.correlationHeaderExcludedDomains = customConfigObj.correlationHeaderExcludedDomains;
            this.proxyHttpUrl = customConfigObj.proxyHttpUrl || this.proxyHttpUrl;
            this.proxyHttpsUrl = customConfigObj.proxyHttpsUrl || this.proxyHttpsUrl;
            this.httpAgent = customConfigObj.httpAgent;
            this.httpsAgent = customConfigObj.httpsAgent;
            this.ignoreLegacyHeaders = customConfigObj.ignoreLegacyHeaders;
            this.disableAllExtendedMetrics = customConfigObj.disableAllExtendedMetrics != undefined ? customConfigObj.disableAllExtendedMetrics : this.disableAllExtendedMetrics;
            this.extendedMetricDisablers = customConfigObj.extendedMetricDisablers || this.extendedMetricDisablers;
            this.distributedTracingMode = customConfigObj.distributedTracingMode;
            this.enableAutoCollectExternalLoggers = customConfigObj.enableAutoCollectExternalLoggers;
            this.enableAutoCollectConsole = customConfigObj.enableAutoCollectConsole;
            this.enableAutoCollectExceptions = customConfigObj.enableAutoCollectExceptions;
            this.enableAutoCollectPerformance = customConfigObj.enableAutoCollectPerformance;
            this.enableAutoCollectExtendedMetrics = customConfigObj.enableAutoCollectExtendedMetrics;
            this.enableAutoCollectPreAggregatedMetrics = customConfigObj.enableAutoCollectPreAggregatedMetrics;
            this.enableAutoCollectHeartbeat = customConfigObj.enableAutoCollectHeartbeat;
            this.enableAutoCollectRequests = customConfigObj.enableAutoCollectRequests;
            this.enableAutoCollectDependencies = customConfigObj.enableAutoCollectDependencies;
            this.enableAutoDependencyCorrelation = customConfigObj.enableAutoDependencyCorrelation;
            this.enableUseAsyncHooks = customConfigObj.enableUseAsyncHooks;
            this.enableUseDiskRetryCaching = customConfigObj.enableUseDiskRetryCaching;
            this.enableResendInterval = customConfigObj.enableResendInterval;
            this.enableMaxBytesOnDisk = customConfigObj.enableMaxBytesOnDisk;
            this.enableInternalDebugLogging = customConfigObj.enableInternalDebugLogging;
            this.enableInternalWarningLogging = customConfigObj.enableInternalWarningLogging;
            this.enableSendLiveMetrics = customConfigObj.enableSendLiveMetrics;
            this.disableAllExtendedMetrics = customConfigObj.disableAllExtendedMetrics;
            this.extendedMetricDisablers = customConfigObj.extendedMetricDisablers;
            this.disableStatsbeat = customConfigObj.disableStatsbeat !== undefined ? customConfigObj.disableStatsbeat : this.disableStatsbeat;
            this.noDiagnosticChannel = customConfigObj.noDiagnosticChannel != undefined ? customConfigObj.noDiagnosticChannel : this.noDiagnosticChannel;
            this.noHttpAgentKeepAlive = customConfigObj.noHttpAgentKeepAlive != undefined ? customConfigObj.noHttpAgentKeepAlive : this.noHttpAgentKeepAlive;
            this.noPatchModules = customConfigObj.noPatchModules != undefined ? customConfigObj.noPatchModules : this.noPatchModules;
        } catch (err) {
            Logging.warn("Error parsing JSON string: ", err);
        }
    }
    connectionString?: string;
    endpointUrl: string;
    maxBatchSize: number;
    maxBatchIntervalMs: number;
    disableAppInsights: boolean;
    samplingPercentage: number;
    correlationIdRetryIntervalMs: number;
    correlationHeaderExcludedDomains: string[];
    proxyHttpUrl: string;
    proxyHttpsUrl: string;
    httpAgent: http.Agent;
    httpsAgent: https.Agent;
    ignoreLegacyHeaders?: boolean;
    distributedTracingMode?: DistributedTracingModes;
    enableAutoCollectExternalLoggers?: boolean;
    enableAutoCollectConsole?: boolean;
    enableAutoCollectExceptions?: boolean;
    enableAutoCollectPerformance?: boolean;
    enableAutoCollectExtendedMetrics?: boolean | IDisabledExtendedMetrics;
    enableAutoCollectPreAggregatedMetrics?: boolean;
    enableAutoCollectHeartbeat?: boolean;
    enableAutoCollectRequests?: boolean;
    enableAutoCollectDependencies?: boolean;
    enableAutoDependencyCorrelation?: boolean;
    enableUseAsyncHooks?: boolean;
    enableUseDiskRetryCaching?: boolean;
    enableResendInterval?: number;
    enableMaxBytesOnDisk?: number;
    enableInternalDebugLogging?: boolean;
    enableInternalWarningLogging?: boolean;
    enableSendLiveMetrics?: boolean;
    disableAllExtendedMetrics?: boolean;
    extendedMetricDisablers?: string;
    disableStatsbeat?: boolean;
    noDiagnosticChannel?: boolean;
    noPatchModules?: string;
    noHttpAgentKeepAlive?: boolean;
}

var jsonConfig = new JsonConfig();
export default jsonConfig;