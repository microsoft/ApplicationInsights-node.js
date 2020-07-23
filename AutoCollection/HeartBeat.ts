import os = require("os");
import TelemetryClient = require("../Library/TelemetryClient");
import Constants = require("../Declarations/Constants");

class HeartBeat {

    public static INSTANCE: HeartBeat;

    private _collectionInterval: number = 900000;
    private _client: TelemetryClient;
    private _handle: NodeJS.Timer;
    private _isEnabled: boolean;
    private _isInitialized: boolean;

    constructor(client: TelemetryClient) {
        if (!HeartBeat.INSTANCE) {
            HeartBeat.INSTANCE = this;
        }

        this._isInitialized = false;
        this._client = client;
    }

    public enable(isEnabled: boolean) {
        this._isEnabled = isEnabled;
        if (this._isEnabled && !this._isInitialized) {
            this._isInitialized = true;
        }

        if (isEnabled) {
            if (!this._handle) {
                this._handle = setInterval(() => this.trackHeartBeat(), this._collectionInterval);
                this._handle.unref(); // Allow the app to terminate even while this loop is going on
            }
        } else {
            if (this._handle) {
                clearInterval(this._handle);
                this._handle = undefined;
            }
        }
    }

    public isInitialized() {
        return this._isInitialized;
    }

    public static isEnabled() {
        return HeartBeat.INSTANCE && HeartBeat.INSTANCE._isEnabled;
    }

    public trackHeartBeat() {
        // get all property values from envrionment to create properties bag
        let properties: {[key: string]: string} = {};
        properties["osType"] = os.type();
        if (process.env.WEBSITE_SITE_NAME) {
            properties["appSrv_SiteName"] = process.env.WEBSITE_SITE_NAME;
            properties["appSrv_wsStamp"] = process.env.WEBSITE_HOME_STAMPNAME || "";
            properties["appSrv_wsHost"] = process.env.WEBSITE_HOSTNAME || "";
        } else if (process.env.FUNCTIONS_WORKER_RUNTIME) {
            properties["azfunction_appId"] = process.env.WEBSITE_HOSTNAME;
        }
        this._client.trackMetric({name: Constants.HeartBeatMetricName, value: 0, properties: properties});
    }

    public dispose() {
        HeartBeat.INSTANCE = null;
        this.enable(false);
        this._isInitialized = false;
    }
}

export = HeartBeat;
