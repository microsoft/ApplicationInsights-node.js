import { createClientLogger, AzureLogger } from "@azure/logger";

class Logging {
    public static enableDebug = false;
    public static disableWarnings = false;
    public static disableErrors = false;
    private static TAG = "ApplicationInsights:";
    public static logger = createClientLogger('ApplicationInsights') as AzureLogger;

    public static debug(message?: any, ...optionalParams: any[]) {
        if(Logging.enableDebug) {
            this.logger.verbose((Logging.TAG + message, optionalParams);
        }
    }

    public static info(message?: any, ...optionalParams: any[]) {
        this.logger.info((Logging.TAG + message, optionalParams);
    }

    public static warn(message?: any, ...optionalParams: any[]) {
        if(!Logging.disableWarnings) {
            this.logger.warning( (Logging.TAG + message, optionalParams);
        }
    }

    public static error(message?: any, ...optionalParams: any[]) {
        if(!Logging.disableErrors) {
            this.logger.error((Logging.TAG + message, optionalParams);
        }
    }
}

export = Logging;
