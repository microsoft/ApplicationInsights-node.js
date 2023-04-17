"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureFunctionsHook = void 0;
var Logging = require("../Library/Logging");
var CorrelationContextManager_1 = require("./CorrelationContextManager");
/** Node.js Azure Functions handle incoming HTTP requests before Application Insights SDK is available,
 * this code generate incoming request telemetry and generate correlation context to be used
 * by outgoing requests and other telemetry, we rely on hooks provided by Azure Functions
*/
var AzureFunctionsHook = /** @class */ (function () {
    function AzureFunctionsHook(client) {
        this._client = client;
        this._autoGenerateIncomingRequests = false;
        try {
            this._functionsCoreModule = require("@azure/functions-core");
            // Only v3 of Azure Functions library is supported right now. See matrix of versions here:
            // https://github.com/Azure/azure-functions-nodejs-library
            var funcProgModel = this._functionsCoreModule.getProgrammingModel();
            if (funcProgModel.name === "@azure/functions" && funcProgModel.version.startsWith("3.")) {
                this._addPreInvocationHook();
                this._addPostInvocationHook();
            }
            else {
                Logging.warn("AzureFunctionsHook does not support model \"" + funcProgModel.name + "\" version \"" + funcProgModel.version + "\"");
            }
        }
        catch (error) {
            Logging.info("AzureFunctionsHook failed to load, not running in Azure Functions");
        }
    }
    AzureFunctionsHook.prototype.enable = function (isEnabled) {
        this._autoGenerateIncomingRequests = isEnabled;
    };
    AzureFunctionsHook.prototype.dispose = function () {
        this.enable(false);
        this._removeInvocationHooks();
        this._functionsCoreModule = undefined;
    };
    AzureFunctionsHook.prototype._addPreInvocationHook = function () {
        var _this = this;
        if (!this._preInvocationHook) {
            this._preInvocationHook = this._functionsCoreModule.registerHook("preInvocation", function (preInvocationContext) { return __awaiter(_this, void 0, void 0, function () {
                var ctx, extractedContext;
                return __generator(this, function (_a) {
                    ctx = preInvocationContext.invocationContext;
                    try {
                        extractedContext = CorrelationContextManager_1.CorrelationContextManager.startOperation(ctx);
                        if (extractedContext) { // Will be null if CorrelationContextManager is not enabled, we should not try to propagate context in that case
                            extractedContext.customProperties.setProperty("InvocationId", ctx.invocationId);
                            if (ctx.traceContext.attributes) {
                                extractedContext.customProperties.setProperty("ProcessId", ctx.traceContext.attributes["ProcessId"]);
                                extractedContext.customProperties.setProperty("LogLevel", ctx.traceContext.attributes["LogLevel"]);
                                extractedContext.customProperties.setProperty("Category", ctx.traceContext.attributes["Category"]);
                                extractedContext.customProperties.setProperty("HostInstanceId", ctx.traceContext.attributes["HostInstanceId"]);
                                extractedContext.customProperties.setProperty("AzFuncLiveLogsSessionId", ctx.traceContext.attributes["#AzFuncLiveLogsSessionId"]);
                            }
                            preInvocationContext.functionCallback = CorrelationContextManager_1.CorrelationContextManager.wrapCallback(preInvocationContext.functionCallback, extractedContext);
                            if (this._isHttpTrigger(ctx) && this._autoGenerateIncomingRequests) {
                                preInvocationContext.hookData.appInsightsExtractedContext = extractedContext;
                                preInvocationContext.hookData.appInsightsStartTime = Date.now(); // Start trackRequest timer
                            }
                        }
                    }
                    catch (err) {
                        Logging.warn("Failed to propagate context in Azure Functions", err);
                        return [2 /*return*/];
                    }
                    return [2 /*return*/];
                });
            }); });
        }
    };
    AzureFunctionsHook.prototype._addPostInvocationHook = function () {
        var _this = this;
        if (!this._postInvocationHook) {
            this._postInvocationHook = this._functionsCoreModule.registerHook("postInvocation", function (postInvocationContext) { return __awaiter(_this, void 0, void 0, function () {
                var ctx, request_1, startTime_1, response_1, extractedContext_1;
                var _this = this;
                return __generator(this, function (_a) {
                    try {
                        if (this._autoGenerateIncomingRequests) {
                            ctx = postInvocationContext.invocationContext;
                            if (this._isHttpTrigger(ctx)) {
                                request_1 = postInvocationContext.inputs[0];
                                if (request_1) {
                                    startTime_1 = postInvocationContext.hookData.appInsightsStartTime || Date.now();
                                    response_1 = this._getAzureFunctionResponse(postInvocationContext, ctx);
                                    extractedContext_1 = postInvocationContext.hookData.appInsightsExtractedContext;
                                    if (!extractedContext_1) {
                                        this._createIncomingRequestTelemetry(request_1, response_1, startTime_1, null);
                                    }
                                    else {
                                        CorrelationContextManager_1.CorrelationContextManager.runWithContext(extractedContext_1, function () {
                                            _this._createIncomingRequestTelemetry(request_1, response_1, startTime_1, extractedContext_1.operation.parentId);
                                        });
                                    }
                                }
                            }
                        }
                    }
                    catch (err) {
                        Logging.warn("Error creating automatic incoming request in Azure Functions", err);
                    }
                    return [2 /*return*/];
                });
            }); });
        }
    };
    AzureFunctionsHook.prototype._createIncomingRequestTelemetry = function (request, response, startTime, parentId) {
        var statusCode = 200; //Default
        for (var _i = 0, _a = [response.statusCode, response.status]; _i < _a.length; _i++) {
            var value = _a[_i];
            if (typeof value === "number" && Number.isInteger(value)) {
                statusCode = value;
                break;
            }
            else if (typeof value === "string") {
                var parsedVal = parseInt(value);
                if (!isNaN(parsedVal)) {
                    statusCode = parsedVal;
                    break;
                }
            }
        }
        this._client.trackRequest({
            name: request.method + " " + request.url,
            resultCode: statusCode,
            success: (0 < statusCode) && (statusCode < 400),
            url: request.url,
            time: new Date(startTime),
            duration: Date.now() - startTime,
            id: parentId
        });
        this._client.flush();
    };
    AzureFunctionsHook.prototype._getAzureFunctionResponse = function (postInvocationContext, ctx) {
        var httpOutputBinding = ctx.bindingDefinitions.find(function (b) { return b.direction === "out" && b.type.toLowerCase() === "http"; });
        if ((httpOutputBinding === null || httpOutputBinding === void 0 ? void 0 : httpOutputBinding.name) === "$return") {
            return postInvocationContext.result;
        }
        else if (httpOutputBinding && ctx.bindings && ctx.bindings[httpOutputBinding.name] !== undefined) {
            return ctx.bindings[httpOutputBinding.name];
        }
        else {
            return ctx.res;
        }
    };
    AzureFunctionsHook.prototype._isHttpTrigger = function (ctx) {
        return ctx.bindingDefinitions.find(function (b) { var _a; return ((_a = b.type) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "httptrigger"; });
    };
    AzureFunctionsHook.prototype._removeInvocationHooks = function () {
        if (this._preInvocationHook) {
            this._preInvocationHook.dispose();
            this._preInvocationHook = undefined;
        }
        if (this._postInvocationHook) {
            this._postInvocationHook.dispose();
            this._postInvocationHook = undefined;
        }
    };
    return AzureFunctionsHook;
}());
exports.AzureFunctionsHook = AzureFunctionsHook;
//# sourceMappingURL=AzureFunctionsHook.js.map