"use strict";
var AutoCollectExceptions = /** @class */ (function () {
    function AutoCollectExceptions(client) {
        if (!!AutoCollectExceptions.INSTANCE) {
            throw new Error("Exception tracking should be configured from the applicationInsights object");
        }
        AutoCollectExceptions.INSTANCE = this;
        this._client = client;
        // Only use for 13.7.0+
        var nodeVer = process.versions.node.split(".");
        AutoCollectExceptions._canUseUncaughtExceptionMonitor = parseInt(nodeVer[0]) > 13 || (parseInt(nodeVer[0]) === 13 && parseInt(nodeVer[1]) >= 7);
    }
    AutoCollectExceptions.prototype.isInitialized = function () {
        return this._isInitialized;
    };
    AutoCollectExceptions.prototype.enable = function (isEnabled) {
        var _this = this;
        if (isEnabled) {
            this._isInitialized = true;
            if (!this._exceptionListenerHandle) {
                // For scenarios like Promise.reject(), an error won't be passed to the handle. Create a placeholder
                // error for these scenarios.
                var handle = function (reThrow, name, error) {
                    if (error === void 0) { error = new Error(AutoCollectExceptions._FALLBACK_ERROR_MESSAGE); }
                    var exceptionTelemetry = { exception: error };
                    // Add full error in context so it could used in telemetryProcessors
                    exceptionTelemetry.contextObjects = {};
                    exceptionTelemetry.contextObjects["Error"] = error;
                    _this._client.trackException(exceptionTelemetry);
                    _this._client.flush({ isAppCrashing: true });
                    // only rethrow when we are the only listener
                    if (reThrow && name && process.listeners(name).length === 1) {
                        console.error(error);
                        process.exit(1);
                    }
                };
                if (AutoCollectExceptions._canUseUncaughtExceptionMonitor) {
                    // Node.js >= 13.7.0, use uncaughtExceptionMonitor. It handles both promises and exceptions
                    this._exceptionListenerHandle = handle.bind(this, false, undefined); // never rethrows
                    process.on(AutoCollectExceptions.UNCAUGHT_EXCEPTION_MONITOR_HANDLER_NAME, this._exceptionListenerHandle);
                }
                else {
                    this._exceptionListenerHandle = handle.bind(this, true, AutoCollectExceptions.UNCAUGHT_EXCEPTION_HANDLER_NAME);
                    this._rejectionListenerHandle = handle.bind(this, false, undefined); // never rethrows
                    process.on(AutoCollectExceptions.UNCAUGHT_EXCEPTION_HANDLER_NAME, this._exceptionListenerHandle);
                    process.on(AutoCollectExceptions.UNHANDLED_REJECTION_HANDLER_NAME, this._rejectionListenerHandle);
                }
            }
        }
        else {
            if (this._exceptionListenerHandle) {
                if (AutoCollectExceptions._canUseUncaughtExceptionMonitor) {
                    process.removeListener(AutoCollectExceptions.UNCAUGHT_EXCEPTION_MONITOR_HANDLER_NAME, this._exceptionListenerHandle);
                }
                else {
                    process.removeListener(AutoCollectExceptions.UNCAUGHT_EXCEPTION_HANDLER_NAME, this._exceptionListenerHandle);
                    process.removeListener(AutoCollectExceptions.UNHANDLED_REJECTION_HANDLER_NAME, this._rejectionListenerHandle);
                }
                this._exceptionListenerHandle = undefined;
                this._rejectionListenerHandle = undefined;
                delete this._exceptionListenerHandle;
                delete this._rejectionListenerHandle;
            }
        }
    };
    AutoCollectExceptions.prototype.dispose = function () {
        AutoCollectExceptions.INSTANCE = null;
        this.enable(false);
        this._isInitialized = false;
    };
    AutoCollectExceptions.INSTANCE = null;
    AutoCollectExceptions.UNCAUGHT_EXCEPTION_MONITOR_HANDLER_NAME = "uncaughtExceptionMonitor";
    AutoCollectExceptions.UNCAUGHT_EXCEPTION_HANDLER_NAME = "uncaughtException";
    AutoCollectExceptions.UNHANDLED_REJECTION_HANDLER_NAME = "unhandledRejection";
    AutoCollectExceptions._RETHROW_EXIT_MESSAGE = "Application Insights Rethrow Exception Handler";
    AutoCollectExceptions._FALLBACK_ERROR_MESSAGE = "A promise was rejected without providing an error. Application Insights generated this error stack for you.";
    AutoCollectExceptions._canUseUncaughtExceptionMonitor = false;
    return AutoCollectExceptions;
}());
module.exports = AutoCollectExceptions;
//# sourceMappingURL=Exceptions.js.map