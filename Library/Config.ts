///<reference path="..\Declarations\node\node.d.ts" />

class Config {

    // Azure adds this prefix to all environment variables
    public static ENV_azurePrefix = "APPSETTING_";

    // This key is provided in the readme
    public static ENV_iKey = "APPINSIGHTS_INSTRUMENTATION_KEY";

    public instrumentationKey: string;
    public sessionRenewalMs: number;
    public sessionExpirationMs: number;
    public endpointUrl: string;
    public maxBatchSize: number;
    public maxBatchIntervalMs: number;
    public disableAppInsights: boolean;

    constructor(instrumentationKey?: string) {
        this.instrumentationKey = instrumentationKey || this._getInstrumentationKey();
        this.endpointUrl = "http://dc.services.visualstudio.com/v2/track";
        this.sessionRenewalMs = 30 * 60 * 1000;
        this.sessionExpirationMs = 24 * 60 * 60 * 1000;
        this.maxBatchSize = 250;
        this.maxBatchIntervalMs = 15000;
        this.disableAppInsights = false;
    }

    private _getInstrumentationKey() {
        // check for both the documented env variable and the azure-prefixed variable
        var iKey = process.env[Config.ENV_iKey] || process.env[Config.ENV_azurePrefix + Config.ENV_iKey];
        if (!iKey || iKey == "") {
            throw new Error("Instrumentation key not found, pass the key in the config to this method or set the key in the environment variable APPINSIGHTS_INSTRUMENTATION_KEY before starting the server");
        }

        return iKey;
    }
}

export = Config;