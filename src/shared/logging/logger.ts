import { diag, DiagLogger, DiagLogLevel } from "@opentelemetry/api";
import { InternalAzureLogger } from "./internalAzureLogger";

export class Logger implements DiagLogger {
    private static _instance: Logger;

    private _TAG = "ApplicationInsights:";
    private _diagLevel: DiagLogLevel;
    private _internalLogger: InternalAzureLogger;

    static getInstance() {
        if (!Logger._instance) {
            Logger._instance = new Logger();
        }
        return Logger._instance;
    }

    constructor() {
        this._internalLogger = new InternalAzureLogger();
        const envLogLevel = process.env.APPLICATIONINSIGHTS_INSTRUMENTATION_LOGGING_LEVEL;
        this._diagLevel = DiagLogLevel.INFO; // Default
        switch (envLogLevel) {
            case "ALL":
                this._diagLevel = DiagLogLevel.ALL;
                break;
            case "DEBUG":
                this._diagLevel = DiagLogLevel.DEBUG;
                break;
            case "ERROR":
                this._diagLevel = DiagLogLevel.ERROR;
                break;
            case "INFO":
                this._diagLevel = DiagLogLevel.INFO;
                break;
            case "NONE":
                this._diagLevel = DiagLogLevel.NONE;
                break;
            case "VERBOSE":
                this._diagLevel = DiagLogLevel.VERBOSE;
                break;
            case "WARN":
                this._diagLevel = DiagLogLevel.WARN;
                break;
        }
        this.updateLogLevel(this._diagLevel);
    }

    public updateLogLevel(logLevel: DiagLogLevel) {
        this._diagLevel = logLevel;
        // Set OpenTelemetry Logger
        diag.setLogger(this, this._diagLevel);
    }

    public error(message?: any, ...optionalParams: any[]) {
        if (this._diagLevel >= DiagLogLevel.ERROR) {
            this._internalLogger.logMessage(this._TAG + message, optionalParams);
        }
    }

    public warn(message?: any, ...optionalParams: any[]) {
        if (this._diagLevel >= DiagLogLevel.WARN) {
            this._internalLogger.logMessage(this._TAG + message, optionalParams);
        }
    }

    public info(message?: any, ...optionalParams: any[]) {
        if (this._diagLevel >= DiagLogLevel.INFO) {
            this._internalLogger.logMessage(this._TAG + message, optionalParams);
        }
    }

    public debug(message?: any, ...optionalParams: any[]) {
        if (this._diagLevel >= DiagLogLevel.DEBUG) {
            this._internalLogger.logMessage(this._TAG + message, optionalParams);
        }
    }

    public verbose(message?: any, ...optionalParams: any[]) {
        if (this._diagLevel >= DiagLogLevel.VERBOSE) {
            this._internalLogger.logMessage(this._TAG + message, optionalParams);
        }
    }
}
