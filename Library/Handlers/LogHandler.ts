// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BatchProcessor } from "./Shared/BatchProcessor";
import { LogExporter } from "../Exporters";
import {
    TelemetryItem as Envelope,
    AvailabilityData,
    TelemetryEventData
} from "../../Declarations/Generated";
import * as Contracts from "../../Declarations/Contracts";
import { AutoCollectConsole } from "../../AutoCollection/Console";
import { AutoCollectExceptions } from "../../AutoCollection/Exceptions";
import { FlushOptions } from "../../Declarations/FlushOptions";
import { Config } from "../Configuration/Config";
import { Statsbeat } from "../../AutoCollection/Statsbeat";
import { Util } from "../Util/Util";
import { Context } from "../Context";

export class LogHandler {
    public isConsole = true;
    public isConsoleLog = false;
    public isExceptions = true;
    public statsbeat: Statsbeat;
    public config: Config;
    private _context: Context;
    private _isStarted = false;
    private _batchProcessor: BatchProcessor;
    private _exporter: LogExporter;
    private _console: AutoCollectConsole;
    private _exceptions: AutoCollectExceptions;

    constructor(config: Config, context: Context) {
        this.config = config;
        this._context = context;
        this._exporter = new LogExporter(config,this._context);
        this._batchProcessor = new BatchProcessor(config, this._exporter);
        this._initializeFlagsFromConfig();
        this._console = new AutoCollectConsole(this);
        this._exceptions = new AutoCollectExceptions(this);
    }

    public start() {
        this._isStarted = true;
        this._console.enable(this.isConsole, this.isConsoleLog);
        this._exceptions.enable(this.isExceptions);
    }

    public flush(options?: FlushOptions) {
        this._batchProcessor.triggerSend(options.isAppCrashing);
    }

    public dispose() {
        this._console.enable(false, false);
        this._console = null;
        this._exceptions.enable(false);
        this._exceptions = null;
    }

    public setAutoCollectConsole(value: boolean, collectConsoleLog: boolean = false) {
        this.isConsole = value;
        this.isConsoleLog = collectConsoleLog;
        if (this._isStarted) {
            this._console.enable(value, collectConsoleLog);
        }
    }

    public setAutoCollectExceptions(value: boolean) {
        this.isExceptions = value;
        if (this._isStarted) {
            this._exceptions.enable(value);
        }
    }

    /**
     * Log information about availability of an application
     * @param telemetry      Object encapsulating tracking options
     */
    public trackAvailability(telemetry: Contracts.AvailabilityTelemetry): void {

    }

    /**
     * Log a page view
     * @param telemetry      Object encapsulating tracking options
     */
    public trackPageView(telemetry: Contracts.PageViewTelemetry): void {

    }

    /**
     * Log a trace message
     * @param telemetry      Object encapsulating tracking options
     */
    public trackTrace(telemetry: Contracts.TraceTelemetry): void {

    }

    /**
     * Log an exception
     * @param telemetry      Object encapsulating tracking options
     */
    public trackException(telemetry: Contracts.ExceptionTelemetry): void {
        if (telemetry && telemetry.exception && !Util.getInstance().isError(telemetry.exception)) {
            telemetry.exception = new Error(telemetry.exception.toString());
        }

    }

    /**
     * Log a user action or other occurrence.
     * @param telemetry      Object encapsulating tracking options
     */
    public trackEvent(telemetry: Contracts.EventTelemetry): void {

    }

    /**
     * Log a user action or other occurrence.
     * @param telemetry      Object encapsulating tracking options
     */
    public track(telemetry: Envelope): void {

        // TODO: Telemetry processor, can we still support them in some cases?
        // TODO: Sampling was done through telemetryProcessor here
        // TODO: All telemetry processors including Azure property where done here as well
        // TODO: Perf and Pre Aggregated metrics were calculated here

        this._batchProcessor.send(telemetry);
    }

    private _convertToEnvelope(eventData: TelemetryEventData): Envelope {
        return null;
    }

    private _initializeFlagsFromConfig() {
        this.isConsole = this.config.enableAutoCollectExternalLoggers !== undefined ? this.config.enableAutoCollectExternalLoggers : this.isConsole;
        this.isConsoleLog = this.config.enableAutoCollectConsole !== undefined ? this.config.enableAutoCollectConsole : this.isConsoleLog;
        this.isExceptions = this.config.enableAutoCollectExceptions !== undefined ? this.config.enableAutoCollectExceptions : this.isExceptions;
    }
}