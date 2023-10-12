// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import { FileWriter } from "./writers/fileWriter";
import { IAgentLogger, IStatusContract, LOGGER_LANGUAGE } from "../types";
import { AZURE_MONITOR_OPENTELEMETRY_VERSION } from "../../types";


export class StatusLogger {
    private _instrumentationKey: string;
    private _language: string;
    private _sdkVersion: string;
    private _processId: string;
    private _machineName: string;
    private _agentLogger: IAgentLogger;

    constructor(instrumentationKey: string, agentLogger: IAgentLogger = console) {
        this._agentLogger = agentLogger;
        this._instrumentationKey = instrumentationKey;
        this._language = LOGGER_LANGUAGE;
        this._sdkVersion = AZURE_MONITOR_OPENTELEMETRY_VERSION;
        this._machineName = os.hostname();
        this._processId = String(process.pid);
    }

    public logStatus(status: IStatusContract, cb?: (err: Error) => void) {
        this._addCommonProperties(status);
        if (typeof cb === "function" && this._agentLogger instanceof FileWriter) {
            this._agentLogger.callback = cb;
        }
        this._agentLogger.log(status);
    }

    private _addCommonProperties(status: IStatusContract) {
        status.AppType = this._language;
        status.MachineName = this._machineName;
        status.PID = this._processId;
        status.SdkVersion = this._sdkVersion;
        status.Ikey = this._instrumentationKey;
    }
}