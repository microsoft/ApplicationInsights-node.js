"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopLogger = void 0;
var NoopLogger = /** @class */ (function () {
    function NoopLogger() {
    }
    NoopLogger.prototype.log = function (message) {
        var optional = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            optional[_i - 1] = arguments[_i];
        }
    };
    NoopLogger.prototype.error = function (message) {
        var optional = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            optional[_i - 1] = arguments[_i];
        }
    };
    return NoopLogger;
}());
exports.NoopLogger = NoopLogger;
//# sourceMappingURL=NoopLogger.js.map