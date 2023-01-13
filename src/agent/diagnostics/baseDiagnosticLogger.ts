import { IAgentLogger, IDiagnosticLog, IDiagnosticLogger, LOGGER_LANGUAGE, LOGGER_NAME } from "../types";
import { APPLICATION_INSIGHTS_SDK_VERSION } from "../../Declarations/Constants";


export class BaseDiagnosticLogger implements IDiagnosticLogger {
    protected _extensionVersion: string;
    protected _instrumentationKey: string;
    protected _loggerName: string;
    protected _language: string;
    protected _sdkVersion: string;
    protected _siteName: string;
    protected _subscriptionId: string;
    protected _agentLogger: IAgentLogger;

    constructor(instrumentationKey: string, agentLogger: IAgentLogger = console) {
        this._agentLogger = agentLogger;
        this._instrumentationKey = instrumentationKey;
        this._loggerName = LOGGER_NAME;
        this._language = LOGGER_LANGUAGE;
        this._siteName = process.env.WEBSITE_SITE_NAME;
        this._extensionVersion = process.env.ApplicationInsightsAgent_EXTENSION_VERSION;
        this._sdkVersion = APPLICATION_INSIGHTS_SDK_VERSION;
        this._subscriptionId = process.env.WEBSITE_OWNER_NAME ? process.env.WEBSITE_OWNER_NAME.split("+")[0] : null;
    }

    public logMessage(diagnosticLog: IDiagnosticLog) { };
}
