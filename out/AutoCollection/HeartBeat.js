"use strict";
var crypto = require("crypto");
var os = require("os");
var Constants = require("../Declarations/Constants");
var Context = require("../Library/Context");
var HeartBeat = /** @class */ (function () {
    function HeartBeat(client) {
        this._collectionInterval = 900000;
        if (!HeartBeat.INSTANCE) {
            HeartBeat.INSTANCE = this;
        }
        this._isInitialized = false;
        this._client = client;
    }
    HeartBeat.prototype.enable = function (isEnabled) {
        var _this = this;
        this._isEnabled = isEnabled;
        if (this._isEnabled && !this._isInitialized) {
            this._isInitialized = true;
        }
        if (isEnabled) {
            if (!this._handle) {
                this._handle = setInterval(function () { return _this.trackHeartBeat(_this._client.config, function () { }); }, this._collectionInterval);
                this._handle.unref(); // Allow the app to terminate even while this loop is going on
            }
        }
        else {
            if (this._handle) {
                clearInterval(this._handle);
                this._handle = null;
            }
        }
    };
    HeartBeat.prototype.isInitialized = function () {
        return this._isInitialized;
    };
    HeartBeat.isEnabled = function () {
        return HeartBeat.INSTANCE && HeartBeat.INSTANCE._isEnabled;
    };
    HeartBeat.prototype.trackHeartBeat = function (config, callback) {
        var properties = {};
        var sdkVersion = Context.sdkVersion; // "node" or "node-nativeperf"
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
    };
    HeartBeat.prototype.dispose = function () {
        HeartBeat.INSTANCE = null;
        this.enable(false);
        this._isInitialized = false;
    };
    return HeartBeat;
}());
module.exports = HeartBeat;
//# sourceMappingURL=HeartBeat.js.map