import { LogHandler } from "./logHandler";

type ExceptionHandle = "uncaughtExceptionMonitor" | "uncaughtException" | "unhandledRejection";
const UNCAUGHT_EXCEPTION_MONITOR_HANDLER_NAME: ExceptionHandle = "uncaughtExceptionMonitor";
const UNCAUGHT_EXCEPTION_HANDLER_NAME: ExceptionHandle = "uncaughtException";
const UNHANDLED_REJECTION_HANDLER_NAME: ExceptionHandle = "unhandledRejection";
const FALLBACK_ERROR_MESSAGE =
    "A promise was rejected without providing an error. Application Insights generated this error stack for you.";

export class AutoCollectExceptions {
    private _canUseUncaughtExceptionMonitor = false;
    private _exceptionListenerHandle?: (error: Error | undefined) => void;
    private _rejectionListenerHandle?: (error: Error | undefined) => void;
    private _handler: LogHandler;

    constructor(handler: LogHandler) {
        this._handler = handler;
        // Only use for 13.7.0+
        const nodeVer = process.versions.node.split(".");
        this._canUseUncaughtExceptionMonitor =
            parseInt(nodeVer[0]) > 13 || (parseInt(nodeVer[0]) === 13 && parseInt(nodeVer[1]) >= 7);

        // For scenarios like Promise.reject(), an error won't be passed to the handle. Create a placeholder
        // error for these scenarios.
        if (this._canUseUncaughtExceptionMonitor) {
            // Node.js >= 13.7.0, use uncaughtExceptionMonitor. It handles both promises and exceptions
            this._exceptionListenerHandle = this._handleException.bind(
                this,
                false,
                UNCAUGHT_EXCEPTION_MONITOR_HANDLER_NAME
            ); // never rethrows
            (<any>process).on(
                UNCAUGHT_EXCEPTION_MONITOR_HANDLER_NAME,
                this._exceptionListenerHandle
            );
        } else {
            this._exceptionListenerHandle = this._handleException.bind(
                this,
                true,
                UNCAUGHT_EXCEPTION_HANDLER_NAME
            );
            this._rejectionListenerHandle = this._handleException.bind(
                this,
                false,
                UNHANDLED_REJECTION_HANDLER_NAME
            ); // never rethrows
            (<any>process).on(
                UNCAUGHT_EXCEPTION_HANDLER_NAME,
                this._exceptionListenerHandle
            );
            (<any>process).on(
                UNHANDLED_REJECTION_HANDLER_NAME,
                this._rejectionListenerHandle
            );
        }
    }

    /** 
  * @deprecated This should not be used
  */
    public enable(isEnabled: boolean) {
        // No Op
    }


    public shutdown() {
        if (this._exceptionListenerHandle) {
            if (this._canUseUncaughtExceptionMonitor) {
                process.removeListener(
                    UNCAUGHT_EXCEPTION_MONITOR_HANDLER_NAME,
                    this._exceptionListenerHandle
                );
            } else {
                if (this._exceptionListenerHandle) {
                    process.removeListener(
                        UNCAUGHT_EXCEPTION_HANDLER_NAME,
                        this._exceptionListenerHandle
                    );
                }
                if (this._rejectionListenerHandle) {
                    process.removeListener(
                        UNHANDLED_REJECTION_HANDLER_NAME,
                        this._rejectionListenerHandle
                    );
                }
            }
            this._exceptionListenerHandle = undefined;
            this._rejectionListenerHandle = undefined;
            delete this._exceptionListenerHandle;
            delete this._rejectionListenerHandle;
        }
    }

    private _handleException(
        reThrow: boolean,
        name: ExceptionHandle,
        error: Error | undefined = new Error(FALLBACK_ERROR_MESSAGE)
    ) {
        if (this._handler) {
            this._handler.trackException({ exception: error });
            this._handler.flush();
            // only rethrow when we are the only listener
            if (reThrow && name && process.listeners(name as any).length === 1) {
                // eslint-disable-next-line no-console
                console.error(error);
                // eslint-disable-next-line no-process-exit
                process.exit(1);
            }
        } else {
            // eslint-disable-next-line no-console
            console.error(error);
            process.exit(1);
        }
    }
}
