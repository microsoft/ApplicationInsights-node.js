import CorrelationIdManager = require('./CorrelationIdManager');
import { IConnectionStringFields } from '../Declarations/Contracts';
import ConnectionStringParser = require('./ConnectionStringParser');
import http = require('http');
import https = require('https');

class Config {

    // Azure adds this prefix to all environment variables
    public static ENV_azurePrefix = "APPSETTING_";

    // This key is provided in the readme
    public static ENV_iKey = "APPINSIGHTS_INSTRUMENTATIONKEY";
    public static legacy_ENV_iKey = "APPINSIGHTS_INSTRUMENTATION_KEY";
    public static ENV_profileQueryEndpoint = "APPINSIGHTS_PROFILE_QUERY_ENDPOINT";
    public static ENV_quickPulseHost = "APPINSIGHTS_QUICKPULSE_HOST";

    // Azure Connection String
    public static ENV_connectionString = "APPINSIGHTS_CONNECTIONSTRING";

    // Native Metrics Opt Outs
    public static ENV_nativeMetricsDisablers = "APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC";
    public static ENV_nativeMetricsDisableAll = "APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS"

    public static ENV_http_proxy = "http_proxy";
    public static ENV_https_proxy = "https_proxy";

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

    private endpointBase: string = "https://dc.services.visualstudio.com";
    private setCorrelationId: (v: string) => void;
    private _profileQueryEndpoint: string;
    /** Host name for quickpulse service */
    private _quickPulseHost: string;


    constructor(instrumentationKey?: string, connectionStringCode?: string) {
        const connectionStringEnv = process.env[Config.ENV_connectionString];
        let csCode: IConnectionStringFields = {};
        let csEnv: IConnectionStringFields = {}; // Create separate objects since we may grab different fields from different CS locations
        if (connectionStringCode) {
            csCode = ConnectionStringParser.parse(connectionStringCode);
        }
        if (connectionStringEnv) {
            csEnv = ConnectionStringParser.parse(connectionStringEnv);
        }

        this.instrumentationKey = csCode.instrumentationkey || instrumentationKey || csEnv.instrumentationkey || Config._getInstrumentationKey();

        this.endpointUrl = `${csCode.ingestionendpoint || csEnv.ingestionendpoint || this.endpointBase}/v2/track`;
        this.maxBatchSize = 250;
        this.maxBatchIntervalMs = 15000;
        this.disableAppInsights = false;
        this.samplingPercentage = 100;
        this.correlationIdRetryIntervalMs = 30 * 1000;
        this.correlationHeaderExcludedDomains = [
            "*.core.windows.net",
            "*.core.chinacloudapi.cn",
            "*.core.cloudapi.de",
            "*.core.usgovcloudapi.net"];

        this.setCorrelationId = (correlationId) => this.correlationId = correlationId;

        this.profileQueryEndpoint = csCode.ingestionendpoint || csEnv.ingestionendpoint || process.env[Config.ENV_profileQueryEndpoint] || this.endpointBase;
        this.proxyHttpUrl = process.env[Config.ENV_http_proxy] || undefined;
        this.proxyHttpsUrl = process.env[Config.ENV_https_proxy] || undefined;
        this.httpAgent = undefined;
        this.httpsAgent = undefined;
        this._quickPulseHost = csCode.liveendpoint || csEnv.liveendpoint || process.env[Config.ENV_quickPulseHost] || "rt.services.visualstudio.com";
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
}

export = Config;
