// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IAgentLogger, IDiagnosticLog } from "../types";
import { BaseDiagnosticLogger } from "./baseDiagnosticLogger";


export class DiagnosticLogger extends BaseDiagnosticLogger {
    constructor(instrumentationKey: string, agentLogger: IAgentLogger = console) {
        super(instrumentationKey, agentLogger);
    }

    public logMessage(diagnosticLog: IDiagnosticLog) {
        this._addCommonProperties(diagnosticLog);
        this._agentLogger.log(diagnosticLog);
    }

    private _addCommonProperties(diagnosticLog: IDiagnosticLog) {
        diagnosticLog.time = new Date().toUTCString();
        diagnosticLog.extensionVersion = this._extensionVersion;
        diagnosticLog.instrumentationKey = this._instrumentationKey;
        diagnosticLog.language = this._language;
        diagnosticLog.loggerName = this._loggerName;
        diagnosticLog.siteName = this._siteName;
        diagnosticLog.sdkVersion = this._sdkVersion;
        diagnosticLog.subscriptionId = this._subscriptionId;
    }
}
