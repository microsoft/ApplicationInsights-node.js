import { InternalAzureLogger } from "./InternalAzureLogger";

export class Logger {
    public static enableDebug = false;
    public static disableWarnings = false;

    private static TAG = "ApplicationInsights:";

    public static debug(message?: any, ...optionalParams: any[]) {
        if (this.enableDebug) {
            InternalAzureLogger.getInstance().debug(this.TAG + message, optionalParams);
        }
    }

    public static info(message?: any, ...optionalParams: any[]) {
        if (this.enableDebug) {
            InternalAzureLogger.getInstance().info(this.TAG + message, optionalParams);
        }
    }

    public static warn(message?: any, ...optionalParams: any[]) {
        if (!this.disableWarnings) {
            InternalAzureLogger.getInstance().warning(this.TAG + message, optionalParams);
        }
    }

    public static error(message?: any, ...optionalParams: any[]) {
        if (!this.disableWarnings) {
            InternalAzureLogger.getInstance().error(this.TAG + message, optionalParams);
        }
    }
}
