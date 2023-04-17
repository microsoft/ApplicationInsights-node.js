"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorrelationContextManager = void 0;
var Logging = require("../Library/Logging");
var DiagChannel = require("./diagnostic-channel/initialization");
var Traceparent = require("../Library/Traceparent");
var Tracestate = require("../Library/Tracestate");
var HttpRequestParser = require("./HttpRequestParser");
var Util = require("../Library/Util");
var CorrelationContextManager = /** @class */ (function () {
    function CorrelationContextManager() {
    }
    /**
     *  Provides the current Context.
     *  The context is the most recent one entered into for the current
     *  logical chain of execution, including across asynchronous calls.
     */
    CorrelationContextManager.getCurrentContext = function () {
        if (!CorrelationContextManager.enabled) {
            return null;
        }
        var context = CorrelationContextManager.session.get(CorrelationContextManager.CONTEXT_NAME);
        if (context === undefined) { // cast undefined to null
            return null;
        }
        return context;
    };
    /**
     *  A helper to generate objects conforming to the CorrelationContext interface
     */
    CorrelationContextManager.generateContextObject = function (operationId, parentId, operationName, correlationContextHeader, traceparent, tracestate) {
        parentId = parentId || operationId;
        if (this.enabled) {
            return {
                operation: {
                    name: operationName,
                    id: operationId,
                    parentId: parentId,
                    traceparent: traceparent,
                    tracestate: tracestate
                },
                customProperties: new CustomPropertiesImpl(correlationContextHeader)
            };
        }
        return null;
    };
    CorrelationContextManager.spanToContextObject = function (spanContext, parentId, name) {
        var traceContext = new Traceparent();
        traceContext.traceId = spanContext.traceId;
        traceContext.spanId = spanContext.spanId;
        traceContext.traceFlag = Traceparent.formatOpenTelemetryTraceFlags(spanContext.traceFlags) || Traceparent.DEFAULT_TRACE_FLAG;
        traceContext.parentId = parentId;
        return CorrelationContextManager.generateContextObject(traceContext.traceId, traceContext.parentId, name, null, traceContext);
    };
    /**
     *  Runs a function inside a given Context.
     *  All logical children of the execution path that entered this Context
     *  will receive this Context object on calls to GetCurrentContext.
     */
    CorrelationContextManager.runWithContext = function (context, fn) {
        var _a;
        if (CorrelationContextManager.enabled) {
            try {
                return CorrelationContextManager.session.bind(fn, (_a = {}, _a[CorrelationContextManager.CONTEXT_NAME] = context, _a))();
            }
            catch (error) {
                Logging.warn("Error binding to session context", Util.dumpObj(error));
            }
        }
        return fn();
    };
    /**
     * Wrapper for cls-hooked bindEmitter method
     */
    CorrelationContextManager.wrapEmitter = function (emitter) {
        if (CorrelationContextManager.enabled) {
            try {
                CorrelationContextManager.session.bindEmitter(emitter);
            }
            catch (error) {
                Logging.warn("Error binding to session context", Util.dumpObj(error));
            }
        }
    };
    /**
     *  Patches a callback to restore the correct Context when getCurrentContext
     *  is run within it. This is necessary if automatic correlation fails to work
     *  with user-included libraries.
     *
     *  The supplied callback will be given the same context that was present for
     *  the call to wrapCallback.  */
    CorrelationContextManager.wrapCallback = function (fn, context) {
        var _a;
        if (CorrelationContextManager.enabled) {
            try {
                return CorrelationContextManager.session.bind(fn, context ? (_a = {},
                    _a[CorrelationContextManager.CONTEXT_NAME] = context,
                    _a) : undefined);
            }
            catch (error) {
                Logging.warn("Error binding to session context", Util.dumpObj(error));
            }
        }
        return fn;
    };
    /**
     *  Enables the CorrelationContextManager.
     */
    CorrelationContextManager.enable = function (forceClsHooked) {
        if (this.enabled) {
            return;
        }
        if (!this.isNodeVersionCompatible()) {
            this.enabled = false;
            return;
        }
        if (!CorrelationContextManager.hasEverEnabled) {
            this.forceClsHooked = forceClsHooked;
            this.hasEverEnabled = true;
            if (typeof this.cls === "undefined") {
                if ((CorrelationContextManager.forceClsHooked === true) || (CorrelationContextManager.forceClsHooked === undefined && CorrelationContextManager.shouldUseClsHooked())) {
                    this.cls = require("cls-hooked");
                }
                else {
                    this.cls = require("continuation-local-storage");
                }
            }
            CorrelationContextManager.session = this.cls.createNamespace("AI-CLS-Session");
            DiagChannel.registerContextPreservation(function (cb) {
                try {
                    return CorrelationContextManager.session.bind(cb);
                }
                catch (error) {
                    Logging.warn("Error binding to session context", Util.dumpObj(error));
                }
            });
        }
        this.enabled = true;
    };
    /**
     * Create new correlation context.
     */
    CorrelationContextManager.startOperation = function (input, request) {
        var traceContext = input && input.traceContext || null;
        var span = input && input.spanContext ? input : null;
        var spanContext = input && input.traceId ? input : null;
        var headers = input && input.headers;
        // OpenTelemetry Span
        if (span) {
            return this.spanToContextObject(span.spanContext(), span.parentSpanId, span.name);
        }
        // OpenTelemetry SpanContext
        if (spanContext) {
            return this.spanToContextObject(spanContext, "|" + spanContext.traceId + "." + spanContext.spanId + ".", typeof request === "string" ? request : "");
        }
        var operationName = typeof request === "string" ? request : "";
        // AzFunction TraceContext
        if (traceContext) {
            var traceparent = null;
            var tracestate = null;
            operationName = traceContext.attributes["OperationName"] || operationName;
            if (request) {
                var azureFnRequest = request;
                if (azureFnRequest.headers) {
                    if (azureFnRequest.headers.traceparent) {
                        traceparent = new Traceparent(azureFnRequest.headers.traceparent);
                    }
                    else if (azureFnRequest.headers["request-id"]) {
                        traceparent = new Traceparent(null, azureFnRequest.headers["request-id"]);
                    }
                    if (azureFnRequest.headers.tracestate) {
                        tracestate = new Tracestate(azureFnRequest.headers.tracestate);
                    }
                }
            }
            if (!traceparent) {
                traceparent = new Traceparent(traceContext.traceparent);
            }
            if (!tracestate) {
                tracestate = new Tracestate(traceContext.tracestate);
            }
            var correlationContextHeader = undefined;
            if (typeof request === "object") {
                var parser = new HttpRequestParser(request);
                correlationContextHeader = parser.getCorrelationContextHeader();
                operationName = parser.getOperationName({});
            }
            var correlationContext = CorrelationContextManager.generateContextObject(traceparent.traceId, traceparent.parentId, operationName, correlationContextHeader, traceparent, tracestate);
            return correlationContext;
        }
        // No TraceContext available, parse as http.IncomingMessage
        if (headers) {
            var traceparent = new Traceparent(headers.traceparent ? headers.traceparent.toString() : null);
            var tracestate = new Tracestate(headers.tracestate ? headers.tracestate.toString() : null);
            var parser = new HttpRequestParser(input);
            var correlationContext = CorrelationContextManager.generateContextObject(traceparent.traceId, traceparent.parentId, parser.getOperationName({}), parser.getCorrelationContextHeader(), traceparent, tracestate);
            return correlationContext;
        }
        Logging.warn("startOperation was called with invalid arguments", arguments);
        return null;
    };
    /**
     *  Disables the CorrelationContextManager.
     */
    CorrelationContextManager.disable = function () {
        this.enabled = false;
    };
    /**
     * Reset the namespace
     */
    CorrelationContextManager.reset = function () {
        if (CorrelationContextManager.hasEverEnabled) {
            CorrelationContextManager.session = null;
            CorrelationContextManager.session = this.cls.createNamespace("AI-CLS-Session");
        }
    };
    /**
     *  Reports if CorrelationContextManager is able to run in this environment
     */
    CorrelationContextManager.isNodeVersionCompatible = function () {
        var nodeVer = process.versions.node.split(".");
        return parseInt(nodeVer[0]) > 3 || (parseInt(nodeVer[0]) > 2 && parseInt(nodeVer[1]) > 2);
    };
    /**
     * We only want to use cls-hooked when it uses async_hooks api (8.2+), else
     * use async-listener (plain -cls)
     */
    CorrelationContextManager.shouldUseClsHooked = function () {
        var nodeVer = process.versions.node.split(".");
        return (parseInt(nodeVer[0]) > 8) || (parseInt(nodeVer[0]) >= 8 && parseInt(nodeVer[1]) >= 2);
    };
    /**
     * A TypeError is triggered by cls-hooked for node [8.0, 8.2)
     * @internal Used in tests only
     */
    CorrelationContextManager.canUseClsHooked = function () {
        var nodeVer = process.versions.node.split(".");
        var greater800 = (parseInt(nodeVer[0]) > 8) || (parseInt(nodeVer[0]) >= 8 && parseInt(nodeVer[1]) >= 0);
        var less820 = (parseInt(nodeVer[0]) < 8) || (parseInt(nodeVer[0]) <= 8 && parseInt(nodeVer[1]) < 2);
        var greater470 = parseInt(nodeVer[0]) > 4 || (parseInt(nodeVer[0]) >= 4 && parseInt(nodeVer[1]) >= 7); // cls-hooked requires node 4.7+
        return !(greater800 && less820) && greater470;
    };
    CorrelationContextManager.enabled = false;
    CorrelationContextManager.hasEverEnabled = false;
    CorrelationContextManager.forceClsHooked = undefined; // true: use cls-hooked, false: use cls, undefined: choose based on node version
    CorrelationContextManager.CONTEXT_NAME = "ApplicationInsights-Context";
    return CorrelationContextManager;
}());
exports.CorrelationContextManager = CorrelationContextManager;
var CustomPropertiesImpl = /** @class */ (function () {
    function CustomPropertiesImpl(header) {
        this.props = [];
        this.addHeaderData(header);
    }
    CustomPropertiesImpl.prototype.addHeaderData = function (header) {
        var keyvals = header ? header.split(", ") : [];
        this.props = keyvals.map(function (keyval) {
            var parts = keyval.split("=");
            return { key: parts[0], value: parts[1] };
        }).concat(this.props);
    };
    CustomPropertiesImpl.prototype.serializeToHeader = function () {
        return this.props.map(function (keyval) {
            return keyval.key + "=" + keyval.value;
        }).join(", ");
    };
    CustomPropertiesImpl.prototype.getProperty = function (prop) {
        for (var i = 0; i < this.props.length; ++i) {
            var keyval = this.props[i];
            if (keyval.key === prop) {
                return keyval.value;
            }
        }
        return;
    };
    // TODO: Strictly according to the spec, properties which are recieved from
    // an incoming request should be left untouched, while we may add our own new
    // properties. The logic here will need to change to track that.
    CustomPropertiesImpl.prototype.setProperty = function (prop, val) {
        if (CustomPropertiesImpl.bannedCharacters.test(prop) || CustomPropertiesImpl.bannedCharacters.test(val)) {
            Logging.warn("Correlation context property keys and values must not contain ',' or '='. setProperty was called with key: " + prop + " and value: " + val);
            return;
        }
        for (var i = 0; i < this.props.length; ++i) {
            var keyval = this.props[i];
            if (keyval.key === prop) {
                keyval.value = val;
                return;
            }
        }
        this.props.push({ key: prop, value: val });
    };
    CustomPropertiesImpl.bannedCharacters = /[,=]/;
    return CustomPropertiesImpl;
}());
//# sourceMappingURL=CorrelationContextManager.js.map