import { IJsonConfig } from "./IJsonConfig";
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

export class JsonConfig {
    private static _jsonConfig: IJsonConfig;

    static getJsonConfig() {
        if (!JsonConfig._jsonConfig) {
            JsonConfig._jsonConfig = this.generateConfigurationObject();
        }
        return JsonConfig._jsonConfig;
    }

    static generateConfigurationObject(): IJsonConfig {
        if (this._jsonConfig) {
            return this._jsonConfig;
        }
        this._jsonConfig = {} as IJsonConfig;
        this._jsonConfig.connectionString = process.env[ENV_connectionString];
        this._jsonConfig.disableAllExtendedMetrics = !!process.env[ENV_nativeMetricsDisableAll];
        this._jsonConfig.extendedMetricDisablers = process.env[ENV_nativeMetricsDisablers];
        this._jsonConfig.proxyHttpUrl = process.env[ENV_http_proxy];
        this._jsonConfig.proxyHttpsUrl = process.env[ENV_https_proxy];
        this._jsonConfig.noDiagnosticChannel = !!process.env[ENV_noDiagnosticChannel];
        this._jsonConfig.disableStatsbeat = !!process.env[ENV_noStatsbeat];
        this._jsonConfig.noHttpAgentKeepAlive = !!process.env[ENV_noHttpAgentKeepAlive];
        this._jsonConfig.noPatchModules = process.env[ENV_noPatchModules] || "";
        try {
            const customConfigObj = JSON.parse(fs.readFileSync(process.env[APPLICATION_INSIGHTS_CONFIG_PATH] || "", "utf8"));
            this._jsonConfig.endpointUrl = customConfigObj.endpointUrl;
            this._jsonConfig.connectionString = customConfigObj.connectionString || this._jsonConfig.connectionString;
            this._jsonConfig.maxBatchSize = customConfigObj.maxBatchSize;
            this._jsonConfig.maxBatchIntervalMs = customConfigObj.maxBatchIntervalMs;
            this._jsonConfig.disableAppInsights = customConfigObj.disableAppInsights;
            this._jsonConfig.samplingPercentage = customConfigObj.samplingPercentage;
            this._jsonConfig.correlationIdRetryIntervalMs = customConfigObj.correlationIdRetryIntervalMs;
            this._jsonConfig.correlationHeaderExcludedDomains = customConfigObj.correlationHeaderExcludedDomains;
            this._jsonConfig.proxyHttpUrl = customConfigObj.proxyHttpUrl || this._jsonConfig.proxyHttpUrl;
            this._jsonConfig.proxyHttpsUrl = customConfigObj.proxyHttpsUrl || this._jsonConfig.proxyHttpsUrl;
            this._jsonConfig.httpAgent = customConfigObj.httpAgent;
            this._jsonConfig.httpsAgent = customConfigObj.httpsAgent;
            this._jsonConfig.ignoreLegacyHeaders = customConfigObj.ignoreLegacyHeaders;
            this._jsonConfig.disableAllExtendedMetrics = customConfigObj.disableAllExtendedMetrics != undefined ? customConfigObj.disableAllExtendedMetrics : this._jsonConfig.disableAllExtendedMetrics;
            this._jsonConfig.extendedMetricDisablers = customConfigObj.extendedMetricDisablers || this._jsonConfig.extendedMetricDisablers;
            this._jsonConfig.distributedTracingMode = customConfigObj.distributedTracingMode;
            this._jsonConfig.enableAutoCollectExternalLoggers = customConfigObj.enableAutoCollectExternalLoggers;
            this._jsonConfig.enableAutoCollectConsole = customConfigObj.enableAutoCollectConsole;
            this._jsonConfig.enableAutoCollectExceptions = customConfigObj.enableAutoCollectExceptions;
            this._jsonConfig.enableAutoCollectPerformance = customConfigObj.enableAutoCollectPerformance;
            this._jsonConfig.enableAutoCollectExtendedMetrics = customConfigObj.enableAutoCollectExtendedMetrics;
            this._jsonConfig.enableAutoCollectPreAggregatedMetrics = customConfigObj.enableAutoCollectPreAggregatedMetrics;
            this._jsonConfig.enableAutoCollectHeartbeat = customConfigObj.enableAutoCollectHeartbeat;
            this._jsonConfig.enableAutoCollectRequests = customConfigObj.enableAutoCollectRequests;
            this._jsonConfig.enableAutoCollectDependencies = customConfigObj.enableAutoCollectDependencies;
            this._jsonConfig.enableAutoDependencyCorrelation = customConfigObj.enableAutoDependencyCorrelation;
            this._jsonConfig.enableUseAsyncHooks = customConfigObj.enableUseAsyncHooks;
            this._jsonConfig.enableUseDiskRetryCaching = customConfigObj.enableUseDiskRetryCaching;
            this._jsonConfig.enableResendInterval = customConfigObj.enableResendInterval;
            this._jsonConfig.enableMaxBytesOnDisk = customConfigObj.enableMaxBytesOnDisk;
            this._jsonConfig.enableInternalDebugLogging = customConfigObj.enableInternalDebugLogging;
            this._jsonConfig.enableInternalWarningLogging = customConfigObj.enableInternalWarningLogging;
            this._jsonConfig.enableSendLiveMetrics = customConfigObj.enableSendLiveMetrics;
            this._jsonConfig.disableAllExtendedMetrics = customConfigObj.disableAllExtendedMetrics;
            this._jsonConfig.extendedMetricDisablers = customConfigObj.extendedMetricDisablers;
            this._jsonConfig.disableStatsbeat = customConfigObj.disableStatsbeat !== undefined ? customConfigObj.disableStatsbeat : this._jsonConfig.disableStatsbeat;
            this._jsonConfig.noDiagnosticChannel = customConfigObj.noDiagnosticChannel != undefined ? customConfigObj.noDiagnosticChannel : this._jsonConfig.noDiagnosticChannel;
            this._jsonConfig.noHttpAgentKeepAlive = customConfigObj.noHttpAgentKeepAlive != undefined ? customConfigObj.noHttpAgentKeepAlive : this._jsonConfig.noHttpAgentKeepAlive;
            this._jsonConfig.noPatchModules = customConfigObj.noPatchModules != undefined ? customConfigObj.noPatchModules : this._jsonConfig.noPatchModules;
        } catch (err) {
            Logging.warn("Error parsing JSON string: ", err);
        }
        return this._jsonConfig;
    }
}
