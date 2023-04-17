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
var https = require("https");
var AutoCollectHttpDependencies = require("../AutoCollection/HttpDependencies");
var Logging = require("./Logging");
var QuickPulseUtil = require("./QuickPulseUtil");
var Util = require("./Util");
var url = require("url");
var QuickPulseConfig = {
    method: "POST",
    time: "x-ms-qps-transmission-time",
    pollingIntervalHint: "x-ms-qps-service-polling-interval-hint",
    endpointRedirect: "x-ms-qps-service-endpoint-redirect-v2",
    instanceName: "x-ms-qps-instance-name",
    streamId: "x-ms-qps-stream-id",
    machineName: "x-ms-qps-machine-name",
    roleName: "x-ms-qps-role-name",
    streamid: "x-ms-qps-stream-id",
    invariantVersion: "x-ms-qps-invariant-version",
    subscribed: "x-ms-qps-subscribed"
};
var QuickPulseSender = /** @class */ (function () {
    function QuickPulseSender(config, getAuthorizationHandler) {
        this._config = config;
        this._consecutiveErrors = 0;
        this._getAuthorizationHandler = getAuthorizationHandler;
    }
    QuickPulseSender.prototype.ping = function (envelope, redirectedHostEndpoint, done) {
        var pingHeaders = [
            { name: QuickPulseConfig.streamId, value: envelope.StreamId },
            { name: QuickPulseConfig.machineName, value: envelope.MachineName },
            { name: QuickPulseConfig.roleName, value: envelope.RoleName },
            { name: QuickPulseConfig.instanceName, value: envelope.Instance },
            { name: QuickPulseConfig.invariantVersion, value: envelope.InvariantVersion.toString() }
        ];
        this._submitData(envelope, redirectedHostEndpoint, done, "ping", pingHeaders);
    };
    QuickPulseSender.prototype.post = function (envelope, redirectedHostEndpoint, done) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Important: When POSTing data, envelope must be an array
                    return [4 /*yield*/, this._submitData([envelope], redirectedHostEndpoint, done, "post")];
                    case 1:
                        // Important: When POSTing data, envelope must be an array
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    QuickPulseSender.prototype._submitData = function (envelope, redirectedHostEndpoint, done, postOrPing, additionalHeaders) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, options, authHandler, authError_1, notice, req;
            var _a, _b;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        payload = Util.stringify(envelope);
                        options = (_a = {},
                            _a[AutoCollectHttpDependencies.disableCollectionRequestOption] = true,
                            _a.host = (redirectedHostEndpoint && redirectedHostEndpoint.length > 0) ? redirectedHostEndpoint : this._config.quickPulseHost,
                            _a.method = QuickPulseConfig.method,
                            _a.path = "/QuickPulseService.svc/" + postOrPing + "?ikey=" + this._config.instrumentationKey,
                            _a.headers = (_b = {
                                    "Expect": "100-continue"
                                },
                                _b[QuickPulseConfig.time] = QuickPulseUtil.getTransmissionTime(),
                                _b["Content-Type"] = "application\/json",
                                _b["Content-Length"] = Buffer.byteLength(payload),
                                _b),
                            _a);
                        if (additionalHeaders && additionalHeaders.length > 0) {
                            additionalHeaders.forEach(function (header) { return options.headers[header.name] = header.value; });
                        }
                        if (!(postOrPing === "post")) return [3 /*break*/, 4];
                        authHandler = this._getAuthorizationHandler ? this._getAuthorizationHandler(this._config) : null;
                        if (!authHandler) return [3 /*break*/, 4];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        // Add bearer token
                        return [4 /*yield*/, authHandler.addAuthorizationHeader(options)];
                    case 2:
                        // Add bearer token
                        _c.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        authError_1 = _c.sent();
                        notice = "Failed to get AAD bearer token for the Application. Error:";
                        Logging.info(QuickPulseSender.TAG, notice, authError_1);
                        // Do not send request to Quickpulse if auth fails, data will be dropped
                        return [2 /*return*/];
                    case 4:
                        // HTTPS only
                        if (this._config.httpsAgent) {
                            options.agent = this._config.httpsAgent;
                        }
                        else {
                            options.agent = Util.tlsRestrictedAgent;
                        }
                        req = https.request(options, function (res) {
                            if (res.statusCode == 200) {
                                var shouldPOSTData = res.headers[QuickPulseConfig.subscribed] === "true";
                                var redirectHeader = null;
                                try {
                                    redirectHeader = res.headers[QuickPulseConfig.endpointRedirect] ? new url.URL(res.headers[QuickPulseConfig.endpointRedirect].toString()).host : null;
                                }
                                catch (error) {
                                    _this._onError("Failed to parse redirect header from QuickPulse: " + Util.dumpObj(error));
                                }
                                var pollingIntervalHint = res.headers[QuickPulseConfig.pollingIntervalHint] ? parseInt(res.headers[QuickPulseConfig.pollingIntervalHint].toString()) : null;
                                _this._consecutiveErrors = 0;
                                done(shouldPOSTData, res, redirectHeader, pollingIntervalHint);
                            }
                            else {
                                _this._onError("StatusCode:" + res.statusCode + " StatusMessage:" + res.statusMessage);
                                done();
                            }
                        });
                        req.on("error", function (error) {
                            _this._onError(error);
                            done();
                        });
                        req.write(payload);
                        req.end();
                        return [2 /*return*/];
                }
            });
        });
    };
    QuickPulseSender.prototype._onError = function (error) {
        // Unable to contact qps endpoint.
        // Do nothing for now.
        this._consecutiveErrors++;
        // LOG every error, but WARN instead when X number of consecutive errors occur
        var notice = "Transient error connecting to the Live Metrics endpoint. This packet will not appear in your Live Metrics Stream. Error:";
        if (this._consecutiveErrors % QuickPulseSender.MAX_QPS_FAILURES_BEFORE_WARN === 0) {
            notice = "Live Metrics endpoint could not be reached " + this._consecutiveErrors + " consecutive times. Most recent error:";
            Logging.warn(QuickPulseSender.TAG, notice, error);
        }
        else {
            // Potentially transient error, do not change the ping/post state yet.
            Logging.info(QuickPulseSender.TAG, notice, error);
        }
    };
    QuickPulseSender.TAG = "QuickPulseSender";
    QuickPulseSender.MAX_QPS_FAILURES_BEFORE_WARN = 25;
    return QuickPulseSender;
}());
module.exports = QuickPulseSender;
//# sourceMappingURL=QuickPulseSender.js.map