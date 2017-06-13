import Contracts = require("../Declarations/Contracts");
import Logging = require("./Logging");
import Sender = require("./Sender");

class Channel {
    protected _buffer:string[];
    protected _lastSend:number;
    protected _timeoutHandle:any;

    protected _isDisabled: () => boolean;
    protected _getBatchSize: () => number;
    protected _getBatchIntervalMs: () => number;
    protected _sender: Sender;

    constructor(isDisabled: () => boolean, getBatchSize: () => number, getBatchIntervalMs: () => number, sender: Sender) {
        this._buffer = [];
        this._lastSend = 0;
        this._isDisabled = isDisabled;
        this._getBatchSize = getBatchSize;
        this._getBatchIntervalMs = getBatchIntervalMs;
        this._sender = sender;
    }

    /**
     * Enable or disable offline mode
     */
    public setOfflineMode(value: boolean, resendInterval?: number) {
        this._sender.setOfflineMode(value, resendInterval);
    }

    /**
     * Add a telemetry item to the send buffer
     */
    public send(envelope: Contracts.Envelope) {

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

        // check if the incoming payload is too large, truncate if necessary
        var payload:string = this._stringify(envelope);
        if (typeof payload !== "string"){
            return;
        }

        // enqueue the payload
        this._buffer.push(payload);

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

    public handleCrash(envelope: Contracts.Envelope) {
        if(envelope) {
            var payload = this._stringify(envelope);
            if (typeof payload === "string") {
                this._buffer.push(payload);
                this.triggerSend(true);
            } else {
                Logging.warn("Could not send crash", envelope);
            }
        } else {
            Logging.warn("handleCrash was called with empty payload", envelope);
        }
    }

    /**
     * Immediately send buffered data
     */
    public triggerSend(isNodeCrashing: boolean, callback?: (v: string) => void) {
        let bufferIsEmpty = this._buffer.length < 1;
        if (!bufferIsEmpty) {
            // compose an array of payloads
            var batch = this._buffer.join("\n");

            // invoke send
            if(isNodeCrashing) {
                this._sender.saveOnCrash(batch);
                if (typeof callback === "function") {
                    callback("data saved on crash");
                }
            } else {
                this._sender.send(new Buffer(batch), callback);
            }
        }

        // update lastSend time to enable throttling
        this._lastSend = +new Date;

        // clear buffer
        this._buffer.length = 0;
        clearTimeout(this._timeoutHandle);
        this._timeoutHandle = null;
        if (bufferIsEmpty && typeof callback === "function") {
            callback("no data to send");
        }
    }

    private _stringify(envelope: Contracts.Envelope) {
        try {
            return JSON.stringify(envelope);
        } catch (error) {
            Logging.warn("Failed to serialize payload", error, envelope);
        }
    }
}

export = Channel;