import ContractsModule = require("./Contracts");
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
    public setOfflineMode(value: boolean) {
        this._sender.setOfflineMode(value);
    }

    /**
     * Add a telemetry item to the send buffer
     */
    public send(envelope: ContractsModule.Contracts.Envelope) {

        // if master off switch is set, don't send any data
        if (this._isDisabled()) {
            // Do not send/save data
            console.log("error sending data, channel is disabled");
            return;
        }

        // validate input
        if (!envelope) {
            Logging.warn("Cannot send null/undefined telemetry");
            console.log("error sending data, null/undefined telemetry");
            return;
        }

        // check if the incoming payload is too large, truncate if necessary
        var payload:string = this._stringify(envelope);
        if (typeof payload !== "string"){
            console.log("error sending data, type is not string");
            return;
        }

        // enqueue the payload
        this._buffer.push(payload);

        // flush if we would exceed the max-size limit by adding this item
        if (this._buffer.length >= this._getBatchSize()) {
            console.log("triggering send because buffer is max size " + this._buffer.length);
            this.triggerSend(false);
            return;
        }

        // ensure an invocation timeout is set if anything is in the buffer
        if (!this._timeoutHandle && this._buffer.length > 0) {
            this._timeoutHandle = setTimeout(() => {
                this._timeoutHandle = null;
                console.log("triggering send because timeout");
                this.triggerSend(false);
            }, this._getBatchIntervalMs());
        }
    }

    public handleCrash(envelope: ContractsModule.Contracts.Envelope) {
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
    public triggerSend(isNodeCrashing: boolean, callback?: (string) => void) {
        console.log("triggerSend Is node crashing = " + isNodeCrashing);
        if (this._buffer.length) {
            console.log("buffer is not empty");
            // compose an array of payloads
            var batch = this._buffer.join("\n");
            console.log("batch created");
            // invoke send
            if(isNodeCrashing) {
                this._sender.saveOnCrash(batch);
            } else {
                console.log("calling send");
                this._sender.send(new Buffer(batch), callback);
            }
        }
        console.log("updating last send and clearing buffer");
        // update lastSend time to enable throttling
        this._lastSend = +new Date;

        // clear buffer
        this._buffer.length = 0;
        clearTimeout(this._timeoutHandle);
        this._timeoutHandle = null;
        console.log("done triggering send");
    }

    private _stringify(envelope) {
        try {
            return JSON.stringify(envelope);
        } catch (error) {
            Logging.warn("Failed to serialize payload", error, envelope);
        }
    }
}

export = Channel;
