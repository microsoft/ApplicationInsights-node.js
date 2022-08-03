"use strict";

import * as path from "path";
import * as DataModel from "./DataModel";
import { FileWriter } from "./FileWriter";
import { homedir } from "./Helpers/FileHelpers";
import { APPLICATION_INSIGHTS_SDK_VERSION } from "../Declarations/Constants";
import Util = require("../Library/Util");

export class DiagnosticLogger {
    public static readonly DEFAULT_FILE_NAME: string = "application-insights-extension.log";
    public static readonly DEFAULT_LOG_DIR: string = process.env.APPLICATIONINSIGHTS_LOGDIR || path.join(homedir, "LogFiles/ApplicationInsights");
    public static DefaultEnvelope: DataModel.DiagnosticLog = {
        message: null,
        level: null,
        time: null,
        logger: "applicationinsights.extension.diagnostics",
        properties: {
            language: "nodejs",
            operation: "Startup",
            siteName: process.env.WEBSITE_SITE_NAME,
            ikey: "unknown",
            extensionVersion: process.env.ApplicationInsightsAgent_EXTENSION_VERSION,
            sdkVersion: APPLICATION_INSIGHTS_SDK_VERSION,
            subscriptionId: process.env.WEBSITE_OWNER_NAME ? process.env.WEBSITE_OWNER_NAME.split("+")[0] : null
        }
    }

    constructor(private _writer: DataModel.AgentLogger = console, instrumentationKey: string = "unknown") {
        DiagnosticLogger.DefaultEnvelope.properties.ikey = instrumentationKey;
    }

    logMessage(message: DataModel.DiagnosticLog | string) {
        if (typeof message === "string") {
            const diagnosticMessage: DataModel.DiagnosticLog = {
                ...DiagnosticLogger.DefaultEnvelope,
                message,
                level: DataModel.SeverityLevel.INFO,
                time: new Date().toISOString()
            };
            this._writer.log(diagnosticMessage);
        } else {
            if (message.level === DataModel.SeverityLevel.ERROR) {
                this._writer.error(message);
            } else {
                this._writer.log(message);
            }
        }
    }

    logError(message: DataModel.DiagnosticLog | string, err?: Error) {
        if (err) {
            message += ` ${Util.dumpObj(err)}`;
        }
        if (typeof message === "string") {
            const diagnosticMessage: DataModel.DiagnosticLog = {
                ...DiagnosticLogger.DefaultEnvelope,
                message,
                level: DataModel.SeverityLevel.ERROR,
                time: new Date().toUTCString()
            };
            this._writer.error(diagnosticMessage);
        } else {
            this._writer.error(message);
        }
    }
}
