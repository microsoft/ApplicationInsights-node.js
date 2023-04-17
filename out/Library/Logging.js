"use strict";
var InternalAzureLogger = require("./InternalAzureLogger");
var Logging = /** @class */ (function () {
    function Logging() {
    }
    Logging.info = function (message) {
        var optionalParams = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            optionalParams[_i - 1] = arguments[_i];
        }
        if (this.enableDebug) {
            InternalAzureLogger.getInstance().info(this.TAG + message, optionalParams);
        }
    };
    Logging.warn = function (message) {
        var optionalParams = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            optionalParams[_i - 1] = arguments[_i];
        }
        if (!this.disableWarnings) {
            InternalAzureLogger.getInstance().warning(this.TAG + message, optionalParams);
        }
    };
    Logging.enableDebug = false;
    Logging.disableWarnings = false;
    Logging.TAG = "ApplicationInsights:";
    return Logging;
}());
module.exports = Logging;
//# sourceMappingURL=Logging.js.map