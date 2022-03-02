// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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

export class LogHandler {
    // Default values
    public isConsole = true;
    public isConsoleLog = false;
    public isExceptions = true;
    public statsbeat: Statsbeat;

    private _exporter: LogExporter;
    private _console: AutoCollectConsole;
    private _exceptions: AutoCollectExceptions;
    private _config: Config;
    private _isStarted = false;

    constructor(config: Config, statsbeat?: Statsbeat) {
        this._config = config;
        this.statsbeat = statsbeat;
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
        // TODO: Use new channel
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

    }

    /**
     * Log a user action or other occurrence.
     * @param telemetry      Object encapsulating tracking options
     */
    public trackEvent(telemetry: Contracts.EventTelemetry): void {

    }

    private _convertToEnvelope(eventData: TelemetryEventData): Envelope {
        return null;
    }

    private _initializeFlagsFromConfig() {
        this.isConsole = this._config.enableAutoCollectExternalLoggers !== undefined ? this._config.enableAutoCollectExternalLoggers : this.isConsole;
        this.isConsoleLog = this._config.enableAutoCollectConsole !== undefined ? this._config.enableAutoCollectConsole : this.isConsoleLog;
        this.isExceptions = this._config.enableAutoCollectExceptions !== undefined ? this._config.enableAutoCollectExceptions : this.isExceptions;
    }
}