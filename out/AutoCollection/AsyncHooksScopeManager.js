"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncScopeManager = exports.OpenTelemetryScopeManagerWrapper = void 0;
var CorrelationContextManager_1 = require("./CorrelationContextManager");
var events_1 = require("events");
var OpenTelemetryScopeManagerWrapper = /** @class */ (function () {
    function OpenTelemetryScopeManagerWrapper() {
    }
    OpenTelemetryScopeManagerWrapper.prototype.active = function () {
        var _this = this;
        var context = CorrelationContextManager_1.CorrelationContextManager.getCurrentContext();
        return __assign(__assign({}, context), { getValue: function (key) {
                // todo: lazy import activeSymbol from opentelemetry/api
                if (!_this._activeSymbol) {
                    _this._activeSymbol = key;
                    return context;
                }
                if (key === _this._activeSymbol) {
                    return context;
                }
                return false;
            }, setValue: function () { } });
    };
    OpenTelemetryScopeManagerWrapper.prototype.with = function (span, fn) {
        var parentSpanId = span.parentSpanId;
        var name = span.name;
        var correlationContext = OpenTelemetryScopeManagerWrapper._spanToContext(span, parentSpanId, name);
        return CorrelationContextManager_1.CorrelationContextManager.runWithContext(correlationContext, fn)();
    };
    OpenTelemetryScopeManagerWrapper.prototype.bind = function (target) {
        if (typeof target === "function") {
            return CorrelationContextManager_1.CorrelationContextManager.wrapCallback(target);
        }
        else if (target instanceof events_1.EventEmitter) {
            CorrelationContextManager_1.CorrelationContextManager.wrapEmitter(target);
        }
        return target;
    };
    OpenTelemetryScopeManagerWrapper.prototype.enable = function () {
        CorrelationContextManager_1.CorrelationContextManager.enable();
        return this;
    };
    OpenTelemetryScopeManagerWrapper.prototype.disable = function () {
        CorrelationContextManager_1.CorrelationContextManager.disable();
        return this;
    };
    OpenTelemetryScopeManagerWrapper._spanToContext = function (span, parentSpanId, name) {
        var spanContext = span.spanContext ? span.spanContext() : span.context(); // context is available in OT API <v0.19.0
        var context = __assign(__assign({}, span.spanContext()), { traceFlags: span.spanContext().traceFlags });
        var parentId = parentSpanId ? "|" + spanContext.traceId + "." + parentSpanId + "." : spanContext.traceId;
        var aiContext = CorrelationContextManager_1.CorrelationContextManager.getCurrentContext();
        if (aiContext) {
            context.traceId = aiContext.operation.id;
            // If parent is no available use current context
            if (!parentSpanId) {
                parentId = aiContext.operation.parentId;
            }
        }
        var correlationContext = CorrelationContextManager_1.CorrelationContextManager.spanToContextObject(context, parentId, name);
        return correlationContext;
    };
    return OpenTelemetryScopeManagerWrapper;
}());
exports.OpenTelemetryScopeManagerWrapper = OpenTelemetryScopeManagerWrapper;
exports.AsyncScopeManager = new OpenTelemetryScopeManagerWrapper();
//# sourceMappingURL=AsyncHooksScopeManager.js.map