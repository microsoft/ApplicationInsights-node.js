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

export class CustomConfig {
    static _configPath: string = process.env[APPLICATION_INSIGHTS_CONFIG_PATH] || "";
    static _config: ICustomConfig;

    public static generateConfigurationObject(): ICustomConfig {
        if (this._config) {
            return this._config;
        }
        this._config = {} as ICustomConfig;
        this._config.connectionString = process.env[ENV_connectionString]; // lxiao - undefined?
        this._config.disableAllExtendedMetrics = !!process.env[ENV_nativeMetricsDisableAll];
        this._config.extendedMetricDisablers = process.env[ENV_nativeMetricsDisablers];
        this._config.proxyHttpUrl = process.env[ENV_http_proxy];
        this._config.proxyHttpsUrl = process.env[ENV_https_proxy];
        this._config.noDiagnosticChannel = !!process.env["APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL"];
        this._config.disableStatsbeat = !!process.env["APPLICATION_INSIGHTS_NO_STATSBEAT"];
        this._config.noHttpAgentKeepAlive = !!process.env["APPLICATION_INSIGHTS_NO_HTTP_AGENT_KEEP_ALIVE"];
        this._config.noPatchModules = process.env["APPLICATION_INSIGHTS_NO_PATCH_MODULES"] || "";
        try {
            const customConfigObj = JSON.parse(fs.readFileSync(this._configPath, "utf8"));
            this._config.connectionString = customConfigObj.connectionString || this._config.connectionString;
            this._config.disableAllExtendedMetrics = customConfigObj.disableAllExtendedMetrics || this._config.disableAllExtendedMetrics;
            this._config.extendedMetricDisablers = customConfigObj.extendedMetricDisablers || this._config.extendedMetricDisablers;
            this._config.proxyHttpUrl = customConfigObj.proxyHttpUrl || this._config.proxyHttpUrl;
            this._config.proxyHttpsUrl = customConfigObj.proxyHttpsUrl || this._config.proxyHttpsUrl;
            this._config.noDiagnosticChannel = customConfigObj.noDiagnosticChannel || this._config.noDiagnosticChannel;
            this._config.disableStatsbeat = customConfigObj.disableStatsbeat || this._config.disableStatsbeat;
            this._config.noHttpAgentKeepAlive = customConfigObj.noHttpAgentKeepAlive || this._config.noHttpAgentKeepAlive;
            this._config.noPatchModules = customConfigObj.noPatchModules || this._config.noPatchModules;
        } catch (err) {
            Logging.warn("Error parsing JSON string: ", err);
        }
        return this._config;
    }
}
