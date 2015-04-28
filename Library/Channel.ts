import ContractsModule = require("../Generated/Contracts");
import Logging = require("./Logging");
import Sender = require("./Sender");

class Channel {
    private _buffer:string[];
    private _lastSend:number;
    private _timeoutHandle:any;

    private _isDisabled: () => boolean;
    private _getBatchSize: () => number;
    private _getBatchIntervalMs: () => number;
    private _sender: Sender;

    constructor(isDisabled: () => boolean, getBatchSize: () => number, getBatchIntervalMs: () => number, sender: Sender) {
        this._buffer = [];
        this._lastSend = 0;
        this._isDisabled = isDisabled;
        this._getBatchSize = getBatchSize;
        this._getBatchIntervalMs = getBatchIntervalMs;
        this._sender = sender;
    }

    /**
     * Add a telemetry item to the send buffer
     */
    public send(envelope: ContractsModule.Contracts.Envelope) {

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
        var payload:string = JSON.stringify(envelope);

        // flush if we would exceet the max-size limit by adding this item
        if (this._buffer.length >= this._getBatchSize()) {
            this.triggerSend();
        }

        // enqueue the payload
        this._buffer.push(payload);

        // ensure an invocation timeout is set
        if (!this._timeoutHandle) {
            this._timeoutHandle = setTimeout(() => {
                this._timeoutHandle = null;
                this.triggerSend();
            }, this._getBatchIntervalMs());
        }
    }

    public handleCrash(envelope: ContractsModule.Contracts.Envelope) {
        var payload = JSON.stringify(envelope);
        this._buffer.push(payload);
        this.triggerSend(true);
    }

    /**
     * Immediately send buffered data
     */
    public triggerSend(isNodeCrashing?: boolean) {

        if (this._buffer.length) {
            // compose an array of payloads
            var batch = "[" + this._buffer.join(",") + "]";

            // invoke send
            if(isNodeCrashing) {
                this._sender.saveOnCrash(batch);
            } else {
                this._sender.send(new Buffer(batch));
            }
        }

        // update lastSend time to enable throttling
        this._lastSend = +new Date;

        // clear buffer
        this._buffer.length = 0;
        clearTimeout(this._timeoutHandle);
        this._timeoutHandle = null;
    }

    private static _getSizeInBytes(list:string[]) {
        var size = 0;
        if (list && list.length) {
            for (var i = 0; i < list.length; i++) {
                var item = list[i];
                if (item && item.length) {
                    size += item.length;
                }
            }
        }

        return size;
    }
}

export = Channel;