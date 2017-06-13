import CorrelationIdManager = require('./CorrelationIdManager');

class Config {

    // Azure adds this prefix to all environment variables
    public static ENV_azurePrefix = "APPSETTING_";

    // This key is provided in the readme
    public static ENV_iKey = "APPINSIGHTS_INSTRUMENTATIONKEY";
    public static legacy_ENV_iKey = "APPINSIGHTS_INSTRUMENTATION_KEY";
    public static ENV_profileQueryEndpoint = "APPINSIGHTS_PROFILE_QUERY_ENDPOINT";

    public instrumentationKey: string;
    public correlationId: string;
    public sessionRenewalMs: number;
    public sessionExpirationMs: number;
    public endpointUrl: string;
    public maxBatchSize: number;
    public maxBatchIntervalMs: number;
    public disableAppInsights: boolean;
    public samplingPercentage: number;
    public correlationIdRetryIntervalMs: number;

    private endpointBase: string = "https://dc.services.visualstudio.com";
    private setCorrelationId: (v: string) => void;
    private _profileQueryEndpoint: string;

    // A list of domains for which correlation headers will not be added.
    public correlationHeaderExcludedDomains: string[];

    constructor(instrumentationKey?: string) {
        this.instrumentationKey = instrumentationKey || Config._getInstrumentationKey();
        this.endpointUrl = `${this.endpointBase}/v2/track`;
        this.sessionRenewalMs = 30 * 60 * 1000;
        this.sessionExpirationMs = 24 * 60 * 60 * 1000;
        this.maxBatchSize = 250;
        this.maxBatchIntervalMs = 15000;
        this.disableAppInsights = false;
        this.samplingPercentage = 100;
        this.correlationIdRetryIntervalMs = 30 * 1000;
        this.correlationHeaderExcludedDomains = [
            "*.blob.core.windows.net", 
            "*.blob.core.chinacloudapi.cn",
            "*.blob.core.cloudapi.de",
            "*.blob.core.usgovcloudapi.net"];
        
        this.setCorrelationId = (correlationId) => this.correlationId = correlationId;

        this.profileQueryEndpoint = process.env[Config.ENV_profileQueryEndpoint] || this.endpointBase;
    }

    public set profileQueryEndpoint(endpoint: string) {
        CorrelationIdManager.cancelCorrelationIdQuery(this._profileQueryEndpoint, this.instrumentationKey, this.setCorrelationId);
        this._profileQueryEndpoint = endpoint;
        this.correlationId = CorrelationIdManager.correlationIdPrefix; // Reset the correlationId while we wait for the new query
        CorrelationIdManager.queryCorrelationId(
            this._profileQueryEndpoint,
            this.instrumentationKey,
            this.correlationIdRetryIntervalMs,
            this.setCorrelationId);
    }

    public get profileQueryEndpoint() {
        return this._profileQueryEndpoint;
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
