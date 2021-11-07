import { ICustomConfig } from "../Library/ICustomConfig";
import Logging = require('./Logging');

import fs = require("fs");

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

export class CustomConfig {
    static _config: ICustomConfig;

    public static generateConfigurationObject(): ICustomConfig {
        if (this._config) {
            return this._config;
        }
        this._config = {} as ICustomConfig;
        this._config.connectionString = process.env[ENV_connectionString];
        this._config.disableAllExtendedMetrics = !!process.env[ENV_nativeMetricsDisableAll];
        this._config.extendedMetricDisablers = process.env[ENV_nativeMetricsDisablers];
        this._config.proxyHttpUrl = process.env[ENV_http_proxy];
        this._config.proxyHttpsUrl = process.env[ENV_https_proxy];
        this._config.noDiagnosticChannel = !!process.env[ENV_noDiagnosticChannel];
        this._config.disableStatsbeat = !!process.env[ENV_noStatsbeat];
        this._config.noHttpAgentKeepAlive = !!process.env[ENV_noHttpAgentKeepAlive];
        this._config.noPatchModules = process.env[ENV_noPatchModules] || "";
        try {
            const customConfigObj = JSON.parse(fs.readFileSync(process.env[APPLICATION_INSIGHTS_CONFIG_PATH] || "", "utf8"));
            this._config.connectionString = customConfigObj.connectionString || this._config.connectionString;
            this._config.endpointUrl = customConfigObj.endpointUrl;
            this._config.maxBatchSize = customConfigObj.maxBatchSize;
            this._config.maxBatchIntervalMs = customConfigObj.maxBatchIntervalMs;
            this._config.disableAppInsights = customConfigObj.disableAppInsights;
            this._config.samplingPercentage = customConfigObj.samplingPercentage;
            this._config.correlationIdRetryIntervalMs = customConfigObj.correlationIdRetryIntervalMs;
            this._config.correlationHeaderExcludedDomains = customConfigObj.correlationHeaderExcludedDomains;
            this._config.proxyHttpUrl = customConfigObj.proxyHttpUrl || this._config.proxyHttpUrl;
            this._config.proxyHttpsUrl = customConfigObj.proxyHttpsUrl || this._config.proxyHttpsUrl;
            this._config.httpAgent = customConfigObj.httpAgent;
            this._config.httpsAgent = customConfigObj.httpsAgent;
            this._config.ignoreLegacyHeaders = customConfigObj.ignoreLegacyHeaders;
            this._config.disableAllExtendedMetrics = customConfigObj.disableAllExtendedMetrics != undefined ? customConfigObj.disableAllExtendedMetrics : this._config.disableAllExtendedMetrics;
            this._config.extendedMetricDisablers = customConfigObj.extendedMetricDisablers || this._config.extendedMetricDisablers;
            this._config.distributedTracingMode = customConfigObj.distributedTracingMode;
            this._config.enableAutoCollectExternalLoggers = customConfigObj.enableAutoCollectExternalLoggers;
            this._config.enableAutoCollectConsole = customConfigObj.enableAutoCollectConsole;
            this._config.enableAutoCollectExceptions = customConfigObj.enableAutoCollectExceptions;
            this._config.enableAutoCollectPerformance = customConfigObj.enableAutoCollectPerformance;
            this._config.enableAutoCollectExtendedMetrics = customConfigObj.enableAutoCollectExtendedMetrics;
            this._config.enableAutoCollectPreAggregatedMetrics = customConfigObj.enableAutoCollectPreAggregatedMetrics;
            this._config.enableAutoCollectHeartbeat = customConfigObj.enableAutoCollectHeartbeat;
            this._config.enableAutoCollectRequests = customConfigObj.enableAutoCollectRequests;
            this._config.enableAutoCollectDependencies = customConfigObj.enableAutoCollectDependencies;
            this._config.enableAutoDependencyCorrelation = customConfigObj.enableAutoDependencyCorrelation;
            this._config.enableUseAsyncHooks = customConfigObj.enableUseAsyncHooks;
            this._config.enableUseDiskRetryCaching = customConfigObj.enableUseDiskRetryCaching;
            this._config.enableResendInterval = customConfigObj.enableResendInterval;
            this._config.enableMaxBytesOnDisk = customConfigObj.enableMaxBytesOnDisk;
            this._config.enableInternalDebugLogging = customConfigObj.enableInternalDebugLogging;
            this._config.enableInternalWarningLogging = customConfigObj.enableInternalWarningLogging;
            this._config.enableSendLiveMetrics = customConfigObj.enableSendLiveMetrics;
            this._config.disableAllExtendedMetrics = customConfigObj.disableAllExtendedMetrics;
            this._config.extendedMetricDisablers = customConfigObj.extendedMetricDisablers;
            this._config.disableStatsbeat = customConfigObj.disableStatsbeat !== undefined ? customConfigObj.disableStatsbeat : this._config.disableStatsbeat;
            this._config.noDiagnosticChannel = customConfigObj.noDiagnosticChannel != undefined ? customConfigObj.noDiagnosticChannel : this._config.noDiagnosticChannel;
            this._config.noHttpAgentKeepAlive = customConfigObj.noHttpAgentKeepAlive != undefined ? customConfigObj.noHttpAgentKeepAlive : this._config.noHttpAgentKeepAlive;
            this._config.noPatchModules = customConfigObj.noPatchModules != undefined ? customConfigObj.noPatchModules : this._config.noPatchModules;
        } catch (err) {
            Logging.warn("Error parsing JSON string: ", err);
        }
        return this._config;
    }
}
