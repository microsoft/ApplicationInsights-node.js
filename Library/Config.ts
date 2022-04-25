import azureCore = require("@azure/core-http");

import CorrelationIdManager = require("./CorrelationIdManager");
import ConnectionStringParser = require("./ConnectionStringParser");
import Logging = require("./Logging");
import Constants = require("../Declarations/Constants");
import http = require("http");
import https = require("https");
import url = require("url");
import { JsonConfig } from "./JsonConfig";
import { IConfig } from "../Declarations/Interfaces";
import { DistributedTracingModes } from "../applicationinsights";
import { IDisabledExtendedMetrics } from "../AutoCollection/NativePerformance";

class Config implements IConfig {

    public static ENV_azurePrefix = "APPSETTING_"; // Azure adds this prefix to all environment variables
    public static ENV_iKey = "APPINSIGHTS_INSTRUMENTATIONKEY"; // This key is provided in the readme
    public static legacy_ENV_iKey = "APPINSIGHTS_INSTRUMENTATION_KEY";
    public static ENV_profileQueryEndpoint = "APPINSIGHTS_PROFILE_QUERY_ENDPOINT";
    public static ENV_quickPulseHost = "APPINSIGHTS_QUICKPULSE_HOST";

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
    public enableInternalDebugLogging: boolean;
    public enableInternalWarningLogging: boolean;
    public disableAllExtendedMetrics: boolean;
    public disableStatsbeat: boolean;
    public extendedMetricDisablers: string;
    public quickPulseHost: string;
    public enableAutoWebSnippetInjection: boolean;

    public correlationId: string; // TODO: Should be private
    private _connectionString: string;
    private _endpointBase: string = Constants.DEFAULT_BREEZE_ENDPOINT;
    private _setCorrelationId: (v: string) => void;
    private _profileQueryEndpoint: string;
    private _instrumentationKey: string;



    constructor(setupString?: string) {
        // Load config values from env variables and JSON if available
        this._mergeConfig();
        const connectionStringEnv: string | undefined = this._connectionString;
        const csCode = ConnectionStringParser.parse(setupString);
        const csEnv = ConnectionStringParser.parse(connectionStringEnv);
        const iKeyCode = !csCode.instrumentationkey && Object.keys(csCode).length > 0
            ? null // CS was valid but instrumentation key was not provided, null and grab from env var
            : setupString; // CS was invalid, so it must be an ikey

        const instrumentationKeyEnv: string | undefined = this._instrumentationKey;
        this.instrumentationKey = csCode.instrumentationkey || iKeyCode /* === instrumentationKey */ || csEnv.instrumentationkey || instrumentationKeyEnv;

        if (!this.instrumentationKey || this.instrumentationKey == "") {
            throw new Error("Instrumentation key not found, please provide a connection string before starting the server");
        }

        let endpoint = `${this.endpointUrl || csCode.ingestionendpoint || csEnv.ingestionendpoint || this._endpointBase}`;
        if (endpoint.endsWith("/")) {
            // Remove extra '/' if present
            endpoint = endpoint.slice(0, -1);
        }
        this.endpointUrl = `${endpoint}/v2.1/track`;
        this.maxBatchSize = this.maxBatchSize || 250;
        this.maxBatchIntervalMs = this.maxBatchIntervalMs || 15000;
        this.disableAppInsights = this.disableAppInsights || false;
        this.samplingPercentage = this.samplingPercentage || 100;
        this.correlationIdRetryIntervalMs = this.correlationIdRetryIntervalMs || 30 * 1000;
        this.enableAutoWebSnippetInjection = this.enableAutoWebSnippetInjection || false;
        this.correlationHeaderExcludedDomains =
            this.correlationHeaderExcludedDomains ||
            [
                "*.core.windows.net",
                "*.core.chinacloudapi.cn",
                "*.core.cloudapi.de",
                "*.core.usgovcloudapi.net",
                "*.core.microsoft.scloud",
                "*.core.eaglex.ic.gov"
            ];

        this._setCorrelationId = (correlationId) => this.correlationId = correlationId;
        this.ignoreLegacyHeaders = this.ignoreLegacyHeaders || false;
        this.profileQueryEndpoint = csCode.ingestionendpoint || csEnv.ingestionendpoint || process.env[Config.ENV_profileQueryEndpoint] || this._endpointBase;
        this.quickPulseHost = this.quickPulseHost || csCode.liveendpoint || csEnv.liveendpoint || process.env[Config.ENV_quickPulseHost] || Constants.DEFAULT_LIVEMETRICS_HOST;
        // Parse quickPulseHost if it starts with http(s)://
        if (this.quickPulseHost.match(/^https?:\/\//)) {
            this.quickPulseHost = new url.URL(this.quickPulseHost).host;
        }
    }

    public set profileQueryEndpoint(endpoint: string) {
        CorrelationIdManager.cancelCorrelationIdQuery(this, this._setCorrelationId);
        this._profileQueryEndpoint = endpoint;
        this.correlationId = CorrelationIdManager.correlationIdPrefix; // Reset the correlationId while we wait for the new query
        CorrelationIdManager.queryCorrelationId(this, this._setCorrelationId);
    }

    public get profileQueryEndpoint() {
        return this._profileQueryEndpoint;
    }

    public set instrumentationKey(iKey: string) {
        if (!Config._validateInstrumentationKey(iKey)) {
            Logging.warn("An invalid instrumentation key was provided. There may be resulting telemetry loss", this.instrumentationKey);
        }
        this._instrumentationKey = iKey;
    }

    public get instrumentationKey(): string {
        return this._instrumentationKey;
    }

    private _mergeConfig() {
        let jsonConfig = JsonConfig.getInstance();
        this._connectionString = jsonConfig.connectionString;
        this._instrumentationKey = jsonConfig.instrumentationKey;
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
        this.enableAutoWebSnippetInjection = jsonConfig.enableAutoWebSnippetInjection;
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
    private static _validateInstrumentationKey(iKey: string): boolean {
        const UUID_Regex = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";
        const regexp = new RegExp(UUID_Regex);
        return regexp.test(iKey);
    }
}

export = Config;
