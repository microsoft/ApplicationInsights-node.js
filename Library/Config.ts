import https = require('https');
import url = require('url');

class Config {

    // Azure adds this prefix to all environment variables
    public static ENV_azurePrefix = "APPSETTING_";

    // This key is provided in the readme
    public static ENV_iKey = "APPINSIGHTS_INSTRUMENTATIONKEY";
    public static legacy_ENV_iKey = "APPINSIGHTS_INSTRUMENTATION_KEY";

    public instrumentationKey: string;
    public correlationId: string;
    public sessionRenewalMs: number;
    public sessionExpirationMs: number;
    public endpointBase: string;
    public endpointUrl: string;
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
        
        this.queryCorrelationId();
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

    private queryCorrelationId() {
        // GET request to `${this.endpointBase}/api/profiles/${this.instrumentationKey}/appId`
        // If it 404s, the iKey is bad and we should give up
        // If it fails otherwise, try again later
        const appIdUrl = url.parse(`${this.endpointBase}/api/profiles/${this.instrumentationKey}/appId`);
        const requestOptions = {
            protocol: appIdUrl.protocol,
            hostname: appIdUrl.host,
            path: appIdUrl.pathname,
            method: 'GET',
            // Ensure this request is not captured by auto-collection.
            // Note: we don't refer to the property in ClientRequestParser because that would cause a cyclical dependency
            disableAppInsightsAutoCollection: true
        };

        const fetchAppId = () => {
            const req = https.request(requestOptions, (res) => {
                if (res.statusCode === 200) {
                    // Success; extract the appId from the body
                    let appId = "";
                    res.setEncoding("utf-8");
                    res.on('data', function (data) {
                        appId += data;
                    });
                    res.on('end', () => {
                        this.correlationId = `cid-v1:${appId}`;
                    });
                } else if (res.statusCode >= 400 && res.statusCode < 500) {
                    // Not found, probably a bad key. Do not try again.
                } else {
                    // Retry after timeout.
                    setTimeout(fetchAppId, this.correlationIdRetryInterval);
                }
            });
            req.end();
        }
        
    }
}

export = Config;
