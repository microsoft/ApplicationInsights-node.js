class Logging {
    public static enableDebug = false;
    public static disableWarnings = false;
    public static disableErrors = false;

    private static TAG = "ApplicationInsights:";

    public static info(message?: any, ...optionalParams: any[]) {
        if(Logging.enableDebug) {
            console.info(Logging.TAG + message, optionalParams);
        }
    }

    public static warn(message?: any, ...optionalParams: any[]) {
        if(!Logging.disableWarnings) {
            console.warn(Logging.TAG + message, optionalParams);
        }
    }
}

export = Logging;