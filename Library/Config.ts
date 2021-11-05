import azureCore = require("@azure/core-http");

import CorrelationIdManager = require('./CorrelationIdManager');
import ConnectionStringParser = require('./ConnectionStringParser');
import Logging = require('./Logging');
import Constants = require('../Declarations/Constants');
import http = require('http');
import https = require('https');
import url = require('url');
import { CustomConfig } from "./CustomConfig";
import { ICustomConfig } from "../Library/ICustomConfig";
import { DistributedTracingModes, setRetry, setLiveMetricsFlag } from "../applicationinsights";
import { AutoCollectNativePerformance, IDisabledExtendedMetrics } from "../AutoCollection/NativePerformance";

class Config {
    // Azure adds this prefix to all environment variables
    public static ENV_azurePrefix = "APPSETTING_";

    // This key is provided in the readme
    public static ENV_iKey = "APPINSIGHTS_INSTRUMENTATIONKEY";
    public static legacy_ENV_iKey = "APPINSIGHTS_INSTRUMENTATION_KEY";
    public static ENV_profileQueryEndpoint = "APPINSIGHTS_PROFILE_QUERY_ENDPOINT";
    public static ENV_quickPulseHost = "APPINSIGHTS_QUICKPULSE_HOST";

    /** An identifier for your Application Insights resource */
    public instrumentationKey: string;
    /** The id for cross-component correlation. READ ONLY. */
    public correlationId: string;
    /** The ingestion endpoint to send telemetry payloads to */
    public endpointUrl: string;
    /** The maximum number of telemetry items to include in a payload to the ingestion endpoint (Default 250) */
    public maxBatchSize: number;
    /** The maximum amount of time to wait for a payload to reach maxBatchSize (Default 15000) */
    public maxBatchIntervalMs: number;
    /** A flag indicating if telemetry transmission is disabled (Default false) */
    public disableAppInsights: boolean;
    /** The percentage of telemetry items tracked that should be transmitted (Default 100) */
    public samplingPercentage: number;
    /** The time to wait before retrying to retrieve the id for cross-component correlation (Default 30000) */
    public correlationIdRetryIntervalMs: number;
    /** A list of domains to exclude from cross-component header injection */
    public correlationHeaderExcludedDomains: string[];
    /** A proxy server for SDK HTTP traffic (Optional, Default pulled from `http_proxy` environment variable) */
    public proxyHttpUrl: string;
    /** A proxy server for SDK HTTPS traffic (Optional, Default pulled from `https_proxy` environment variable) */
    public proxyHttpsUrl: string;
    /** An http.Agent to use for SDK HTTP traffic (Optional, Default undefined) */
    public httpAgent: http.Agent;
    /** An https.Agent to use for SDK HTTPS traffic (Optional, Default undefined) */
    public httpsAgent: https.Agent;
    /** Disable including legacy headers in outgoing requests, x-ms-request-id */
    public ignoreLegacyHeaders?: boolean;
    /** AAD TokenCredential to use to authenticate the app */
    public aadTokenCredential?: azureCore.TokenCredential;

    private endpointBase: string = Constants.DEFAULT_BREEZE_ENDPOINT;
    private setCorrelationId: (v: string) => void;
    private _profileQueryEndpoint: string;
    /** Host name for quickpulse service */
    private _quickPulseHost: string;
    
    /** private config object that is populated from config json file */
    private _config : ICustomConfig = CustomConfig.generateConfigurationObject();

    public enableAutoCollectConsole: boolean; // enable auto collect console
    public enableAutoCollectExceptions: boolean;
    public enableAutoCollectPerformance: boolean;
    public enableNativePerformance: boolean;
    public enableAutoCollectExternalLoggers: boolean; // enable auto collect bunyan & winston
    public disabledExtendedMetrics: IDisabledExtendedMetrics;
    public enableAutoCollectPreAggregatedMetrics: boolean;
    public enableAutoCollectHeartbeat: boolean;
    public enableAutoCollectRequests: boolean;
    public enableAutoCollectDependencies: boolean;
    public enableAutoDependencyCorrelation: boolean;
    public enableUseAsyncHooks: boolean;
    public disableStatsbeat: boolean;

    constructor(setupString?: string) {
        this._generateConfigurationObjectFromEnvVars();

        const connectionStringEnv: string | undefined = this._config.connectionString;
        const csCode = ConnectionStringParser.parse(setupString);
        const csEnv = ConnectionStringParser.parse(connectionStringEnv);
        const iKeyCode = !csCode.instrumentationkey && Object.keys(csCode).length > 0
            ? null // CS was valid but instrumentation key was not provided, null and grab from env var
            : setupString; // CS was invalid, so it must be an ikey

        this.instrumentationKey = csCode.instrumentationkey || iKeyCode /* === instrumentationKey */ || csEnv.instrumentationkey || Config._getInstrumentationKey();
        // validate ikey. If fails throw a warning
        if (!Config._validateInstrumentationKey(this.instrumentationKey)) {
            Logging.warn("An invalid instrumentation key was provided. There may be resulting telemetry loss", this.instrumentationKey);
        }

        this.endpointUrl = `${this._config.endpointUrl || csCode.ingestionendpoint || csEnv.ingestionendpoint || this.endpointBase}/v2.1/track`;
        this.maxBatchSize = this._config.maxBatchSize || 250;
        this.maxBatchIntervalMs = this._config.maxBatchIntervalMs || 15000;
        this.disableAppInsights = this._config.disableAppInsights || false;
        this.samplingPercentage = this._config.samplingPercentage || 100;
        this.correlationIdRetryIntervalMs = this._config.correlationIdRetryIntervalMs || 30 * 1000;
        this.correlationHeaderExcludedDomains =
        this._config.correlationHeaderExcludedDomains ||
        [
            "*.core.windows.net",
            "*.core.chinacloudapi.cn",
            "*.core.cloudapi.de",
            "*.core.usgovcloudapi.net",
            "*.core.microsoft.scloud",
            "*.core.eaglex.ic.gov"
        ];

        this.setCorrelationId = (correlationId) => this.correlationId = correlationId;

        this.proxyHttpUrl = this._config.proxyHttpUrl;
        this.proxyHttpsUrl = this._config.proxyHttpsUrl;
        this.httpAgent = this._config.httpAgent;
        this.httpsAgent = this._config.httpsAgent;
        this.ignoreLegacyHeaders = this._config.ignoreLegacyHeaders || false;
        this.profileQueryEndpoint = csCode.ingestionendpoint || csEnv.ingestionendpoint || process.env[Config.ENV_profileQueryEndpoint] || this.endpointBase;
        this._quickPulseHost = csCode.liveendpoint || csEnv.liveendpoint || process.env[Config.ENV_quickPulseHost] || Constants.DEFAULT_LIVEMETRICS_HOST;
        // Parse quickPulseHost if it starts with http(s)://
        if (this._quickPulseHost.match(/^https?:\/\//)) {
            this._quickPulseHost = new url.URL(this._quickPulseHost).host;
        }
    }

    private _generateConfigurationObjectFromEnvVars() {
        if (this._config.distributedTracingMode !== undefined) {
            CorrelationIdManager.w3cEnabled = this._config.distributedTracingMode === DistributedTracingModes.AI_AND_W3C;
        }
        if (this._config.enableAutoCollectConsole !== undefined) {
            this.enableAutoCollectConsole = this._config.enableAutoCollectConsole;
        }
        if (this._config.enableAutoCollectExternalLoggers !== undefined) {
            this.enableAutoCollectExternalLoggers = this._config.enableAutoCollectExternalLoggers;
        }
        if (this._config.enableAutoCollectExceptions !== undefined) {
            this.enableAutoCollectExceptions = this._config.enableAutoCollectExceptions;
        }
        if (this._config.enableAutoCollectPerformance !== undefined) {
            this.enableAutoCollectPerformance = this._config.enableAutoCollectPerformance;
        }
        if (this._config.enableAutoCollectExtendedMetrics !== undefined) {
            const extendedMetricsConfig = AutoCollectNativePerformance.parseEnabled(this._config.enableAutoCollectExtendedMetrics, this._config);
            this.enableNativePerformance = extendedMetricsConfig.isEnabled;
            this.disabledExtendedMetrics = extendedMetricsConfig.disabledMetrics;
        }
        if (this._config.enableAutoCollectPreAggregatedMetrics !== undefined) {
            this.enableAutoCollectPreAggregatedMetrics = this._config.enableAutoCollectPreAggregatedMetrics;
        }
        if (this._config.enableAutoCollectHeartbeat !== undefined) {
            this.enableAutoCollectHeartbeat = this._config.enableAutoCollectHeartbeat;
        }
        if (this._config.enableAutoCollectRequests !== undefined) {
            this.enableAutoCollectRequests = this._config.enableAutoCollectRequests;
        }
        if (this._config.enableAutoCollectDependencies !== undefined) {
            this.enableAutoCollectDependencies = this._config.enableAutoCollectDependencies;
        }
        if (this._config.enableAutoDependencyCorrelation !== undefined) {
            this.enableAutoDependencyCorrelation = this._config.enableAutoDependencyCorrelation;
        }
        if (this._config.enableUseAsyncHooks !== undefined) {
            this.enableUseAsyncHooks = this._config.enableUseAsyncHooks;
        }
        if (this._config.enableUseDiskRetryCaching !== undefined) {
            setRetry(this._config.enableUseDiskRetryCaching, this._config.enableResendInterval, this._config.enableMaxBytesOnDisk);
        }
        if (this._config.enableInternalDebugLogging !== undefined) {
            Logging.enableDebug = this._config.enableInternalDebugLogging;
        }
        if (this._config.enableInternalWarningLogging !== undefined) {
            Logging.disableWarnings = !this._config.enableInternalWarningLogging;
        }
        if (this._config.enableSendLiveMetrics !== undefined) {
            setLiveMetricsFlag(this._config.enableSendLiveMetrics);
        }
        if (this._config.disableStatsbeat !== undefined) {
            this.disableStatsbeat = this._config.disableStatsbeat;
        }
    }

    public set profileQueryEndpoint(endpoint: string) {
        CorrelationIdManager.cancelCorrelationIdQuery(this, this.setCorrelationId);
        this._profileQueryEndpoint = endpoint;
        this.correlationId = CorrelationIdManager.correlationIdPrefix; // Reset the correlationId while we wait for the new query
        CorrelationIdManager.queryCorrelationId(this, this.setCorrelationId);
    }

    public get profileQueryEndpoint() {
        return this._profileQueryEndpoint;
    }

    public set quickPulseHost(host: string) {
        this._quickPulseHost = host;
    }

    public get quickPulseHost(): string {
        return this._quickPulseHost;
    }


    private static _getInstrumentationKey(): string {
        // check for both the documented env variable and the azure-prefixed variable
        var iKey = process.env[Config.ENV_iKey]
            || process.env[Config.ENV_azurePrefix + Config.ENV_iKey]
            || process.env[Config.legacy_ENV_iKey]
            || process.env[Config.ENV_azurePrefix + Config.legacy_ENV_iKey];
        if (!iKey || iKey == "") {
            throw new Error("Instrumentation key not found, pass the key in the config to this method or set the key in the environment variable APPINSIGHTS_INSTRUMENTATIONKEY before starting the server");
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
    private static _validateInstrumentationKey(iKey: string): boolean {
        const UUID_Regex = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        const regexp = new RegExp(UUID_Regex);
        return regexp.test(iKey);
    }
}

export = Config;
