// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IDiagnosticLog } from "../types";
import { BaseDiagnosticLogger } from "./baseDiagnosticLogger";
import { EtwWritter } from "./writers/etwWritter";


export class EtwDiagnosticLogger extends BaseDiagnosticLogger {

    constructor(instrumentationKey: string) {
        super(instrumentationKey);
        this._agentLogger = new EtwWritter();
    }

    public logMessage(diagnosticLog: IDiagnosticLog) {
        let metaData = this._getMetadata();
        metaData.push(diagnosticLog.messageId || "");
        let message: string = diagnosticLog.message;
        this._agentLogger.log(message, metaData);
    }

    private _getMetadata(): [string, string, string, string, string] {
        // Must return strings in this exact order!
        return [ this._extensionVersion, this._subscriptionId, this._siteName, this._sdkVersion, this._instrumentationKey];
      }
}
