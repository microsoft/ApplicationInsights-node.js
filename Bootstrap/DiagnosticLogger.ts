"use strict";

import * as path from "path";
import * as DataModel from "./DataModel";
import { homedir } from "./Helpers/FileHelpers";
import { APPLICATION_INSIGHTS_SDK_VERSION } from "../Declarations/Constants";
import Util = require("../Library/Util");

const LOGGER_NAME = "applicationinsights.extension.diagnostics";

export class DiagnosticLogger {
    public static readonly DEFAULT_FILE_NAME: string = "application-insights-extension.log";
    public static readonly DEFAULT_LOG_DIR: string = process.env.APPLICATIONINSIGHTS_LOGDIR || path.join(homedir, "LogFiles/ApplicationInsights");
    private _defaultProperties: { [key: string]: string } = {
        language: "nodejs",
        operation: "Startup",
        siteName: process.env.WEBSITE_SITE_NAME,
        ikey: "unknown",
        extensionVersion: process.env.ApplicationInsightsAgent_EXTENSION_VERSION,
        sdkVersion: APPLICATION_INSIGHTS_SDK_VERSION,
        subscriptionId: process.env.WEBSITE_OWNER_NAME ? process.env.WEBSITE_OWNER_NAME.split("+")[0] : null
    }

    constructor(private _writer: DataModel.AgentLogger = console, instrumentationKey: string = "unknown") {
        this._defaultProperties.ikey = instrumentationKey;
    }

    logMessage(diagnosticLog: DataModel.DiagnosticLog) {
        let props = Object.assign({}, this._defaultProperties, diagnosticLog.properties);
        const diagnosticMessage: DataModel.DiagnosticLog = {
            properties: props,
            logger: LOGGER_NAME,
            message: diagnosticLog.message,
            level: DataModel.SeverityLevel.INFO,
            time: new Date().toUTCString()
        };
        this._writer.log(diagnosticMessage);
    }

    logError(diagnosticLog: DataModel.DiagnosticLog) {
        let message: string = diagnosticLog.message;
        if (diagnosticLog.exception) {
            message += ` Error: ${Util.dumpObj(diagnosticLog.exception)}`;
        }
        let props = Object.assign({}, this._defaultProperties, diagnosticLog.properties);
        const diagnosticMessage: DataModel.DiagnosticLog = {
            properties: props,
            logger: LOGGER_NAME,
            message: message,
            level: DataModel.SeverityLevel.ERROR,
            time: new Date().toUTCString()
        };
        this._writer.error(diagnosticMessage);
    }
}
