﻿// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { TelemetryItem as Envelope } from "../../declarations/generated";
import { Logger } from "../../shared/logging";
import { LogExporter } from ".";
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
    public async send(envelope: Envelope): Promise<void> {
        // validate input
        if (!envelope) {
            Logger.getInstance().warn("Cannot send null/undefined telemetry");
            return;
        }
        try {
            // enqueue the payload
            this._buffer.push(envelope);
            // flush if we would exceed the max-size limit by adding this item
            if (this._buffer.length >= this._getBatchSize()) {
                await this.triggerSend();
            }
            // ensure an invocation timeout is set if anything is in the buffer
            if (!this._timeoutHandle && this._buffer.length > 0) {
                this._timeoutHandle = setTimeout(async () => {
                    this._timeoutHandle = null;
                    await this.triggerSend();
                }, this._getBatchIntervalMs());
                this._timeoutHandle.unref();
            }
        }
        catch (error) {
            Logger.getInstance().error(error);
        }

    }

    /**
     * Immediately send buffered data
     */
    public async triggerSend(): Promise<void> {
        if (this._buffer.length > 0) {
            await this._exporter.export(this._buffer, (result: ExportResult) => {
                if (result.code === ExportResultCode.FAILED) {
                    Logger.getInstance().warn("Failed to send envelopes.");
                }
            });
        }
        // update lastSend time to enable throttling
        this._lastSend = +new Date();
        // clear buffer
        this._buffer = [];
        clearTimeout(this._timeoutHandle);
        this._timeoutHandle = null;
    }
}