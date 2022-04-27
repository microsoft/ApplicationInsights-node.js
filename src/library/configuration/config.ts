import * as http from "http";
import * as https from "https";
import * as url from "url";
import * as azureCore from "@azure/core-http";

import { ConnectionStringParser } from "./connectionStringParser";
import { Logger } from "../logging";
import * as Constants from "../../declarations/constants";
import { JsonConfig } from "./jsonConfig";
import { IConfig, IDisabledExtendedMetrics } from "../../declarations/interfaces";
import { DistributedTracingModes } from "../../declarations/enumerators";

export class Config implements IConfig {
    // IConfig properties
    public endpointUrl: string;
    public maxBatchSize: number;
    public maxBatchIntervalMs: number;
    public disableAppInsights: boolean;
    public samplingPercentage: number;
    public correlationIdRetryIntervalMs: number;
    public correlationHeaderExcludedDomains: string[];
    public proxyHttpUrl: string;
    public proxyHttpsUrl: string;
    public httpAgent: http.Agent;
    public httpsAgent: https.Agent;
    public ignoreLegacyHeaders: boolean;
    public aadTokenCredential?: azureCore.TokenCredential;
    public enableAutoCollectConsole: boolean;
    public enableAutoCollectExceptions: boolean;
    public enableAutoCollectPerformance: boolean;
    public enableAutoCollectExternalLoggers: boolean;
    public enableAutoCollectPreAggregatedMetrics: boolean;
    public enableAutoCollectHeartbeat: boolean;
    public enableAutoCollectRequests: boolean;
    public enableAutoCollectDependencies: boolean;
    public enableAutoDependencyCorrelation: boolean;
    public enableSendLiveMetrics: boolean;
    public enableUseDiskRetryCaching: boolean;
    public enableUseAsyncHooks: boolean;
    public distributedTracingMode: DistributedTracingModes;
    public enableAutoCollectExtendedMetrics: boolean | IDisabledExtendedMetrics;
    public enableResendInterval: number;
    public enableMaxBytesOnDisk: number;
    public enableInternalDebugLogger: boolean;
    public enableInternalWarningLogger: boolean;
    public disableAllExtendedMetrics: boolean;
    public disableStatsbeat: boolean;
    public extendedMetricDisablers: string;
    public quickPulseHost: string;
    public setupString: string;

    public correlationId: string; // TODO: Should be private
    private _connectionString: string;
    private _endpointBase: string = Constants.DEFAULT_BREEZE_ENDPOINT;
    private _instrumentationKey: string;

    constructor(setupString?: string) {
        this.setupString = setupString;
        // Load config values from env variables and JSON if available
        this._mergeConfig();
        const connectionStringEnv: string | undefined = this._connectionString;
        let connectionStringPrser = new ConnectionStringParser();
        const csCode = connectionStringPrser.parse(setupString);
        const csEnv = connectionStringPrser.parse(connectionStringEnv);
        const iKeyCode =
            !csCode.instrumentationkey && Object.keys(csCode).length > 0
                ? null // CS was valid but instrumentation key was not provided, null and grab from env var
                : setupString; // CS was invalid, so it must be an ikey

        this.instrumentationKey =
            csCode.instrumentationkey ||
            iKeyCode /* === instrumentationKey */ ||
            csEnv.instrumentationkey ||
            this._getInstrumentationKey();
        this.endpointUrl = `${
            this.endpointUrl ||
            csCode.ingestionendpoint ||
            csEnv.ingestionendpoint ||
            this._endpointBase
        }/v2.1/track`;
        this.maxBatchSize = this.maxBatchSize || 250;
        this.maxBatchIntervalMs = this.maxBatchIntervalMs || 15000;
        this.disableAppInsights = this.disableAppInsights || false;
        this.samplingPercentage = this.samplingPercentage || 100;
        this.correlationIdRetryIntervalMs = this.correlationIdRetryIntervalMs || 30 * 1000;
        this.correlationHeaderExcludedDomains = this.correlationHeaderExcludedDomains || [
            "*.core.windows.net",
            "*.core.chinacloudapi.cn",
            "*.core.cloudapi.de",
            "*.core.usgovcloudapi.net",
            "*.core.microsoft.scloud",
            "*.core.eaglex.ic.gov",
        ];
        this.ignoreLegacyHeaders = this.ignoreLegacyHeaders || false;
        this.quickPulseHost =
            this.quickPulseHost ||
            csCode.liveendpoint ||
            csEnv.liveendpoint ||
            process.env[Constants.ENV_QUCKPULSE_HOST] ||
            Constants.DEFAULT_LIVEMETRICS_HOST;
        // Parse quickPulseHost if it starts with http(s)://
        if (this.quickPulseHost.match(/^https?:\/\//)) {
            this.quickPulseHost = new url.URL(this.quickPulseHost).host;
        }
    }

    public set instrumentationKey(iKey: string) {
        if (!this._validateInstrumentationKey(iKey)) {
            Logger.warn(
                "An invalid instrumentation key was provided. There may be resulting telemetry loss",
                this.instrumentationKey
            );
        }
        this._instrumentationKey = iKey;
    }

    public get instrumentationKey(): string {
        return this._instrumentationKey;
    }

    private _mergeConfig() {
        let jsonConfig = JsonConfig.getInstance();
        this._connectionString = jsonConfig.connectionString;
        this.correlationHeaderExcludedDomains = jsonConfig.correlationHeaderExcludedDomains;
        this.correlationIdRetryIntervalMs = jsonConfig.correlationIdRetryIntervalMs;
        this.disableAllExtendedMetrics = jsonConfig.disableAllExtendedMetrics;
        this.disableAppInsights = jsonConfig.disableAppInsights;
        this.disableStatsbeat = jsonConfig.disableStatsbeat;
        this.distributedTracingMode = jsonConfig.distributedTracingMode;
        this.enableAutoCollectConsole = jsonConfig.enableAutoCollectConsole;
        this.enableAutoCollectDependencies = jsonConfig.enableAutoCollectDependencies;
        this.enableAutoCollectExceptions = jsonConfig.enableAutoCollectExceptions;
        this.enableAutoCollectExtendedMetrics = jsonConfig.enableAutoCollectExtendedMetrics;
        this.enableAutoCollectExternalLoggers = jsonConfig.enableAutoCollectExternalLoggers;
        this.enableAutoCollectHeartbeat = jsonConfig.enableAutoCollectHeartbeat;
        this.enableAutoCollectPerformance = jsonConfig.enableAutoCollectPerformance;
        this.enableAutoCollectPreAggregatedMetrics =
            jsonConfig.enableAutoCollectPreAggregatedMetrics;
        this.enableAutoCollectRequests = jsonConfig.enableAutoCollectRequests;
        this.enableAutoDependencyCorrelation = jsonConfig.enableAutoDependencyCorrelation;
        this.enableInternalDebugLogger = jsonConfig.enableInternalDebugLogger;
        this.enableInternalWarningLogger = jsonConfig.enableInternalWarningLogger;
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
    }

    private _getInstrumentationKey(): string {
        // check for both the documented env variable and the azure-prefixed variable
        var iKey =
            process.env[Constants.ENV_IKEY] ||
            process.env[Constants.ENV_AZURE_PREFIX + Constants.ENV_IKEY] ||
            process.env[Constants.LEGACY_ENV_IKEY] ||
            process.env[Constants.ENV_AZURE_PREFIX + Constants.LEGACY_ENV_IKEY];
        if (!iKey || iKey == "") {
            throw new Error(
                "Instrumentation key not found, pass the key in the config to this method or set the key in the environment variable APPINSIGHTS_INSTRUMENTATIONKEY before starting the server"
            );
        }

        return iKey;
    }

    /**
     * Validate UUID Format
     * Specs taken from breeze repo
     * The definition of a VALID instrumentation key is as follows:
     * Not none
     * Not empty
     * Every character is a hex character [0-9a-f]
     * 32 characters are separated into 5 sections via 4 dashes
     * First section has 8 characters
     * Second section has 4 characters
     * Third section has 4 characters
     * Fourth section has 4 characters
     * Fifth section has 12 characters
     */
    private _validateInstrumentationKey(iKey: string): boolean {
        const UUID_Regex = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";
        const regexp = new RegExp(UUID_Regex);
        return regexp.test(iKey);
    }
}