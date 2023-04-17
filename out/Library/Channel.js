"use strict";
var Logging = require("./Logging");
var Util = require("./Util");
var Channel = /** @class */ (function () {
    function Channel(isDisabled, getBatchSize, getBatchIntervalMs, sender) {
        this._buffer = [];
        this._lastSend = 0;
        this._isDisabled = isDisabled;
        this._getBatchSize = getBatchSize;
        this._getBatchIntervalMs = getBatchIntervalMs;
        this._sender = sender;
    }
    /**
     * Enable or disable disk-backed retry caching to cache events when client is offline (enabled by default)
     * These cached events are stored in your system or user's temporary directory and access restricted to your user when possible.
     * @param value if true events that occurred while client is offline will be cached on disk
     * @param resendInterval The wait interval for resending cached events.
     * @param maxBytesOnDisk The maximum size (in bytes) that the created temporary directory for cache events can grow to, before caching is disabled.
     * @returns {Configuration} this class
     */
    Channel.prototype.setUseDiskRetryCaching = function (value, resendInterval, maxBytesOnDisk) {
        this._sender.setDiskRetryMode(value, resendInterval, maxBytesOnDisk);
    };
    /**
     * Add a telemetry item to the send buffer
     */
    Channel.prototype.send = function (envelope) {
        var _this = this;
        // if master off switch is set, don't send any data
        if (this._isDisabled()) {
            // Do not send/save data
            return;
        }
        // validate input
        if (!envelope) {
            Logging.warn("Cannot send null/undefined telemetry");
            return;
        }
        // enqueue the payload
        this._buffer.push(envelope);
        // flush if we would exceed the max-size limit by adding this item
        if (this._buffer.length >= this._getBatchSize()) {
            this.triggerSend(false);
            return;
        }
        // ensure an invocation timeout is set if anything is in the buffer
        if (!this._timeoutHandle && this._buffer.length > 0) {
            this._timeoutHandle = setTimeout(function () {
                _this._timeoutHandle = null;
                _this.triggerSend(false);
            }, this._getBatchIntervalMs());
        }
    };
    /**
     * Immediately send buffered data
     */
    Channel.prototype.triggerSend = function (isNodeCrashing, callback) {
        var bufferIsEmpty = this._buffer.length < 1;
        if (!bufferIsEmpty) {
            // invoke send
            if (isNodeCrashing || Util.isNodeExit) {
                this._sender.saveOnCrash(this._buffer);
                if (typeof callback === "function") {
                    callback("data saved on crash");
                }
            }
            else {
                this._sender.send(this._buffer, callback);
            }
        }
        // update lastSend time to enable throttling
        this._lastSend = +new Date;
        // clear buffer
        this._buffer = [];
        clearTimeout(this._timeoutHandle);
        this._timeoutHandle = null;
        if (bufferIsEmpty && typeof callback === "function") {
            callback("no data to send");
        }
    };
    return Channel;
}());
module.exports = Channel;
//# sourceMappingURL=Channel.js.map