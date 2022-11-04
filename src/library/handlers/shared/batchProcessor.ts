// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { TelemetryItem as Envelope } from "../../../declarations/generated";
import { Logger } from "../../logging";
import { LogExporter } from "../../exporters";
import { ExportResult, ExportResultCode } from "@opentelemetry/core";

export class BatchProcessor {
    protected _lastSend: number;
    protected _timeoutHandle: any;
    protected _getBatchSize: () => number;
    protected _getBatchIntervalMs: () => number;

    public _exporter: LogExporter;
    public _buffer: Envelope[];

    constructor(exporter: LogExporter) {
        this._buffer = [];
        this._lastSend = 0;
        this._exporter = exporter;
        this._getBatchSize = () => 250;
        this._getBatchIntervalMs = () => 15000;
    }

    /**
     * Add a telemetry item to the send buffer
     */
    public send(envelope: Envelope) {
        // validate input
        if (!envelope) {
            Logger.getInstance().warn("Cannot send null/undefined telemetry");
            return;
        }
        // enqueue the payload
        this._buffer.push(envelope);
        // flush if we would exceed the max-size limit by adding this item
        if (this._buffer.length >= this._getBatchSize()) {
            this.triggerSend();
            return;
        }
        // ensure an invocation timeout is set if anything is in the buffer
        if (!this._timeoutHandle && this._buffer.length > 0) {
            this._timeoutHandle = setTimeout(() => {
                this._timeoutHandle = null;
                this.triggerSend();
            }, this._getBatchIntervalMs());
            this._timeoutHandle.unref();
        }
    }

    /**
     * Immediately send buffered data
     */
    public async triggerSend(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this._buffer.length > 0) {
                this._exporter.export(this._buffer, (result: ExportResult) => {
                    if (result.code === ExportResultCode.SUCCESS) {
                        resolve();
                    } else {
                        reject(result.error ?? new Error("Envelope export failed"));
                    }
                });
            } else {
                resolve();
            }
            // update lastSend time to enable throttling
            this._lastSend = +new Date();
            // clear buffer
            this._buffer = [];
            clearTimeout(this._timeoutHandle);
            this._timeoutHandle = null;
        });
    }
}
