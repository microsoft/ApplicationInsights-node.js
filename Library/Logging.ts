import InternalAzureLogger = require("./InternalAzureLogger");

class Logging {
    public static enableDebug = false;
    public static disableWarnings = false;

    private static TAG = "ApplicationInsights:";

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
}

export = Logging;
