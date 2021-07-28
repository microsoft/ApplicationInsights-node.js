import Contracts = require("../Declarations/Contracts");
import Logging = require("./Logging");
import Sender = require("./Sender");
import {AzureLogger, createClientLogger} from "@azure/logger";
class Channel {

    protected _lastSend: number;
    protected _timeoutHandle: any;
    protected _logger: AzureLogger;

    protected _isDisabled: () => boolean;
    protected _getBatchSize: () => number;
    protected _getBatchIntervalMs: () => number;

    public _sender: Sender;
    public _buffer: Contracts.EnvelopeTelemetry[];

    constructor(isDisabled: () => boolean, getBatchSize: () => number, getBatchIntervalMs: () => number, sender: Sender) {
        this._buffer = [];
        this._lastSend = 0;
        this._isDisabled = isDisabled;
        this._getBatchSize = getBatchSize;
        this._getBatchIntervalMs = getBatchIntervalMs;
        this._sender = sender;
        this._logger = createClientLogger('ApplicationInsights:Channel') as AzureLogger;
    }

    /**
     * Enable or disable disk-backed retry caching to cache events when client is offline (enabled by default)
     * These cached events are stored in your system or user's temporary directory and access restricted to your user when possible.
     * @param value if true events that occurred while client is offline will be cached on disk
     * @param resendInterval The wait interval for resending cached events.
     * @param maxBytesOnDisk The maximum size (in bytes) that the created temporary directory for cache events can grow to, before caching is disabled.
     * @returns {Configuration} this class
     */
    public setUseDiskRetryCaching(value: boolean, resendInterval?: number, maxBytesOnDisk?: number) {
        this._sender.setDiskRetryMode(value, resendInterval, maxBytesOnDisk);
    }

    /**
     * Add a telemetry item to the send buffer
     */
    public send(envelope: Contracts.EnvelopeTelemetry) {

        // if master off switch is set, don't send any data
        if (this._isDisabled()) {
            // Do not send/save data
            return;
        }

        // validate input
        if (!envelope) {
            this._logger.warning("Cannot send null/undefined telemetry");
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
            this._timeoutHandle = setTimeout(() => {
                this._timeoutHandle = null;
                this.triggerSend(false);
            }, this._getBatchIntervalMs());
        }
    }

    /**
     * Immediately send buffered data
     */
    public triggerSend(isNodeCrashing: boolean, callback?: (v: string) => void) {
        let bufferIsEmpty = this._buffer.length < 1;
        if (!bufferIsEmpty) {
            // invoke send
            if (isNodeCrashing) {
                this._sender.saveOnCrash(this._buffer);
                if (typeof callback === "function") {
                    callback("data saved on crash");
                }
            } else {
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
    }
}

export = Channel;
