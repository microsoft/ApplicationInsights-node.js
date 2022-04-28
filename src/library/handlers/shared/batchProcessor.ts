// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { TelemetryItem as Envelope } from "../../../declarations/generated";
import { Config } from "../../configuration";
import { Logger } from "../../logging";
import { Util } from "../../util";
import { BaseExporter } from "../../exporters/shared";

export class BatchProcessor {
    protected _lastSend: number;
    protected _timeoutHandle: any;

    protected _isDisabled: () => boolean;
    protected _getBatchSize: () => number;
    protected _getBatchIntervalMs: () => number;

    public _exporter: BaseExporter;
    public _buffer: Envelope[];

    constructor(config: Config, exporter: BaseExporter) {
        this._buffer = [];
        this._lastSend = 0;
        this._exporter = exporter;
        this._isDisabled = () => config.disableAppInsights;
        this._getBatchSize = () => config.maxBatchSize;
        this._getBatchIntervalMs = () => config.maxBatchIntervalMs;
    }

    /**
     * Add a telemetry item to the send buffer
     */
    public send(envelope: Envelope) {
        // if master off switch is set, don't send any data
        if (this._isDisabled()) {
            // Do not send/save data
            return;
        }
        // validate input
        if (!envelope) {
            Logger.warn("Cannot send null/undefined telemetry");
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
    public async triggerSend(isNodeCrashing: boolean): Promise<string> {
        let bufferIsEmpty = this._buffer.length < 1;
        if (!bufferIsEmpty) {
            // invoke send
            if (isNodeCrashing || Util.getInstance().isNodeExit) {
                try {
                    await this._exporter.persistOnCrash(this._buffer);
                } catch (error) {
                    return "Failed to persist envelopes on app crash";
                }
            } else {
                try {
                    //await this._exporter.export(this._buffer);
                } catch (error) {
                    return "Failed to export envelopes";
                }
            }
        }
        // update lastSend time to enable throttling
        this._lastSend = +new Date();
        // clear buffer
        this._buffer = [];
        clearTimeout(this._timeoutHandle);
        this._timeoutHandle = null;
        if (bufferIsEmpty) {
            return "No data to send";
        }
    }
}
