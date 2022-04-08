import * as DataModel from "./DataModel";
import { FileWriter } from "./FileWriter";
import { APPLICATION_INSIGHTS_SDK_VERSION } from "../Declarations/Constants";

export class DiagnosticLogger {

    private _defaultEnvelope: DataModel.DiagnosticLog = {
        message: null,
        level: null,
        time: null,
        logger: "applicationinsights.extension.diagnostics",
        properties: {
            language: "nodejs",
            operation: "Startup",
            siteName: process.env.WEBSITE_SITE_NAME,
            ikey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
            extensionVersion: process.env.ApplicationInsightsAgent_EXTENSION_VERSION,
            sdkVersion: APPLICATION_INSIGHTS_SDK_VERSION,
            subscriptionId: process.env.WEBSITE_OWNER_NAME ? process.env.WEBSITE_OWNER_NAME.split("+")[0] : null
        }
    }

    constructor(private _writer: DataModel.AgentLogger = console) { }

    logMessage(message: DataModel.DiagnosticLog | string, cb?: (err: Error) => void) {
        if (typeof cb === "function" && this._writer instanceof FileWriter) {
            this._writer.callback = cb;
        }
        if (typeof message === "string") {
            const diagnosticMessage: DataModel.DiagnosticLog = {
                ...this._defaultEnvelope,
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

    logError(message: DataModel.DiagnosticLog | string, cb?: (err: Error) => void) {
        if (typeof cb === "function" && this._writer instanceof FileWriter) {
            this._writer.callback = cb;
        }
        if (typeof message === "string") {
            const diagnosticMessage: DataModel.DiagnosticLog = {
                ...this._defaultEnvelope,
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
