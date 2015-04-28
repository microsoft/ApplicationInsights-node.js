class Logging {
    public static _isInternalCallActive = false;
    public static enableDebug = false;
    public static disableWarnings = false;

    private static TAG = "ApplicationInsights:";

    public static info(message?: any, ...optionalParams: any[]) {
        if(Logging.enableDebug && !Logging._isInternalCallActive) {
            console.info(Logging.TAG + message, optionalParams);
        }
    }

    public static warn(message?: any, ...optionalParams: any[]) {
        if(!Logging.disableWarnings && !Logging._isInternalCallActive) {
            console.warn(Logging.TAG + message, optionalParams);
        }
    }
}

export = Logging;