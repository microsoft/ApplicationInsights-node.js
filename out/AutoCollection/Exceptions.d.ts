import TelemetryClient = require("../Library/TelemetryClient");
declare class AutoCollectExceptions {
    static INSTANCE: AutoCollectExceptions;
    static UNCAUGHT_EXCEPTION_MONITOR_HANDLER_NAME: string;
    static UNCAUGHT_EXCEPTION_HANDLER_NAME: string;
    static UNHANDLED_REJECTION_HANDLER_NAME: string;
    private static _RETHROW_EXIT_MESSAGE;
    private static _FALLBACK_ERROR_MESSAGE;
    private static _canUseUncaughtExceptionMonitor;
    private _exceptionListenerHandle;
    private _rejectionListenerHandle;
    private _client;
    private _isInitialized;
    constructor(client: TelemetryClient);
    isInitialized(): boolean;
    enable(isEnabled: boolean): void;
    dispose(): void;
}
export = AutoCollectExceptions;
