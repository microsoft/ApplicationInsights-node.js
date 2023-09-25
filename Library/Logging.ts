import InternalAzureLogger = require("./InternalAzureLogger");


const ENV_enableDebugLogging = "APPLICATION_INSIGHTS_ENABLE_DEBUG_LOGS";
const ENV_disableWarningLogging = "APPLICATION_INSIGHTS_DISABLE_WARNING_LOGS";

class Logging {
    public static enableDebug = (process.env[ENV_enableDebugLogging]) ? true : false;
    public static disableWarnings = (process.env[ENV_disableWarningLogging]) ? true : false;

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
