import { InternalAzureLogger } from "./InternalAzureLogger";

export class Logger {
    public enableDebug = false;
    public enableInfo = false;
    public disableWarnings = false;
    public disableErrors = false;
    private static _instance: Logger;

    private _TAG = "ApplicationInsights:";

    constructor() {

    }

    public static getInstance() {
        if (!Logger._instance) {
            Logger._instance = new Logger();
        }
        return Logger._instance;
    }

    public debug(message?: any, ...optionalParams: any[]) {
        if (this.enableDebug) {
            InternalAzureLogger.getInstance().debug(this._TAG + message, optionalParams);
        }
    }

    public info(message?: any, ...optionalParams: any[]) {
        if (this.enableInfo) {
            InternalAzureLogger.getInstance().info(this._TAG + message, optionalParams);
        }
    }

    public warn(message?: any, ...optionalParams: any[]) {
        if (!this.disableWarnings) {
            InternalAzureLogger.getInstance().warning(this._TAG + message, optionalParams);
        }
    }

    public error(message?: any, ...optionalParams: any[]) {
        if (!this.disableErrors) {
            InternalAzureLogger.getInstance().error(this._TAG + message, optionalParams);
        }
    }
}
