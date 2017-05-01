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
    public endpointBase: string;
    public endpointUrl: string;
    public profileQueryEndpoint: string;
    public maxBatchSize: number;
    public maxBatchIntervalMs: number;
    public disableAppInsights: boolean;
    public samplingPercentage: number;
    public correlationIdRetryInterval: number;

    // A list of domains for which correlation headers will not be added.
    public correlationHeaderExcludedDomains: string[];

    constructor(instrumentationKey?: string) {
        this.instrumentationKey = instrumentationKey || Config._getInstrumentationKey();
        this.endpointBase = "https://dc.services.visualstudio.com";
        this.endpointUrl = `${this.endpointBase}/v2/track`;
        this.profileQueryEndpoint = process.env[Config.ENV_profileQueryEndpoint] || this.endpointBase;
        this.sessionRenewalMs = 30 * 60 * 1000;
        this.sessionExpirationMs = 24 * 60 * 60 * 1000;
        this.maxBatchSize = 250;
        this.maxBatchIntervalMs = 15000;
        this.disableAppInsights = false;
        this.samplingPercentage = 100;
        this.correlationIdRetryInterval = 30 * 1000;
        this.correlationHeaderExcludedDomains = [
            "*.blob.core.windows.net", 
            "*.blob.core.chinacloudapi.cn",
            "*.blob.core.cloudapi.de",
            "*.blob.core.usgovcloudapi.net"];
        
        this.correlationId = CorrelationIdManager.correlationIdPrefix; // Initialize with a blank correlation ID until we fetch the correct value.
        // Async to allow caller to set profileQueryEndpoint if they wish
        setTimeout(() =>
            CorrelationIdManager.queryCorrelationId(
                this.profileQueryEndpoint,
                this.instrumentationKey,
                this.correlationIdRetryInterval,
                (correlationId) => this.correlationId = correlationId),
            0);
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
