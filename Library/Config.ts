///<reference path="..\typings\globals\node\index.d.ts" />

import crypto = require('crypto');

class Config {

    // Azure adds this prefix to all environment variables
    public static ENV_azurePrefix = "APPSETTING_";

    // This key is provided in the readme
    public static ENV_iKey = "APPINSIGHTS_INSTRUMENTATIONKEY";
    public static legacy_ENV_iKey = "APPINSIGHTS_INSTRUMENTATION_KEY";

    public instrumentationKey: string;
    public instrumentationKeyHash: string;
    public sessionRenewalMs: number;
    public sessionExpirationMs: number;
    public endpointUrl: string;
    public maxBatchSize: number;
    public maxBatchIntervalMs: number;
    public disableAppInsights: boolean;

    constructor(instrumentationKey?: string) {
        this.instrumentationKey = instrumentationKey || Config._getInstrumentationKey();
        this.instrumentationKeyHash = Config._getStringHashBase64(this.instrumentationKey);
        this.endpointUrl = "https://dc.services.visualstudio.com/v2/track";
        this.sessionRenewalMs = 30 * 60 * 1000;
        this.sessionExpirationMs = 24 * 60 * 60 * 1000;
        this.maxBatchSize = 250;
        this.maxBatchIntervalMs = 15000;
        this.disableAppInsights = false;
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

    private static _getStringHashBase64(value: string): string {
        let hash = crypto.createHash('sha256');
        hash.update(value);
        let result = hash.digest('base64');
        return result;
    }
}

export = Config;