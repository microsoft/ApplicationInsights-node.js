import { createClientLogger, AzureLogger } from "@azure/logger";

class Logging {
    public static enableDebug = false;
    public static disableWarnings = false;
    private static TAG = "ApplicationInsights:";
    public static logger = createClientLogger('ApplicationInsights') as AzureLogger;

    public static info(message?: any, ...optionalParams: any[]) {
        if(Logging.enableDebug) {
            this.logger.info(Logging.TAG + message, optionalParams);
        }
    }

    public static warn(message?: any, ...optionalParams: any[]) {
        if(!Logging.disableWarnings) {
            this.logger.warning(Logging.TAG + message, optionalParams);
        }
    }
}

export = Logging;
