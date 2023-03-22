import crypto = require("crypto");
import os = require("os");
import TelemetryClient = require("../Library/TelemetryClient");
import Constants = require("../Declarations/Constants");
import Config = require("../Library/Config");
import Context = require("../Library/Context");

class HeartBeat {

    public static INSTANCE: HeartBeat;

    private _collectionInterval: number = 900000;
    private _client: TelemetryClient;
    private _handle: NodeJS.Timer | null;
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _uniqueProcessId: string;

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
                this._handle = setInterval(() => this.trackHeartBeat(this._client.config, () => { }), this._collectionInterval);
                this._handle.unref(); // Allow the app to terminate even while this loop is going on
            }
        } else {
            if (this._handle) {
                clearInterval(this._handle);
                this._handle = null;
            }
        }
    }

    public isInitialized() {
        return this._isInitialized;
    }

    public static isEnabled() {
        return HeartBeat.INSTANCE && HeartBeat.INSTANCE._isEnabled;
    }

    public trackHeartBeat(config: Config, callback: () => void) {
        let properties: { [key: string]: string } = {};
        const sdkVersion = Context.sdkVersion; // "node" or "node-nativeperf"
        properties["sdkVersion"] = sdkVersion;
        properties["osType"] = os.type();
        properties["osVersion"] = os.release();
        //  Random GUID that would help in analysis when app has stopped and restarted.
        if (!this._uniqueProcessId) {
            this._uniqueProcessId = crypto.randomBytes(16).toString("hex");
        }
        properties["processSessionId"] = this._uniqueProcessId;

        if (process.env.WEBSITE_SITE_NAME) {
            properties["appSrv_SiteName"] = process.env.WEBSITE_SITE_NAME;
        }
        if (process.env.WEBSITE_HOME_STAMPNAME) {
            properties["appSrv_wsStamp"] = process.env.WEBSITE_HOME_STAMPNAME;
        }
        if (process.env.WEBSITE_HOSTNAME) {
            properties["appSrv_wsHost"] = process.env.WEBSITE_HOSTNAME;
        }
        if (process.env.WEBSITE_OWNER_NAME) {
            properties["appSrv_wsOwner"] = process.env.WEBSITE_OWNER_NAME;
        }
        if (process.env.WEBSITE_RESOURCE_GROUP) {
            properties["appSrv_ResourceGroup"] = process.env.WEBSITE_RESOURCE_GROUP;
        }
        if (process.env.WEBSITE_SLOT_NAME) {
            properties["appSrv_SlotName"] = process.env.WEBSITE_SLOT_NAME;
        }
        this._client.trackMetric({ name: Constants.HeartBeatMetricName, value: 0, properties: properties });
        callback();
    }

    public dispose() {
        HeartBeat.INSTANCE = null;
        this.enable(false);
        this._isInitialized = false;
    }
}

export = HeartBeat;
