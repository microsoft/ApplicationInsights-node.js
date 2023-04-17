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
var Logging = require("./Logging");
var QuickPulseEnvelopeFactory = require("./QuickPulseEnvelopeFactory");
var QuickPulseSender = require("./QuickPulseSender");
var Constants = require("../Declarations/Constants");
var Context = require("./Context");
/** State Container for sending to the QuickPulse Service */
var QuickPulseStateManager = /** @class */ (function () {
    function QuickPulseStateManager(config, context, getAuthorizationHandler) {
        this._isCollectingData = false;
        this._lastSuccessTime = Date.now();
        this._lastSendSucceeded = true;
        this._metrics = {};
        this._documents = [];
        this._collectors = [];
        this._redirectedHost = null;
        this._pollingIntervalHint = -1;
        this.config = config;
        this.context = context || new Context();
        this._sender = new QuickPulseSender(this.config, getAuthorizationHandler);
        this._isEnabled = false;
    }
    /**
     *
     * @param collector
     */
    QuickPulseStateManager.prototype.addCollector = function (collector) {
        this._collectors.push(collector);
    };
    /**
     * Override of TelemetryClient.trackMetric
     */
    QuickPulseStateManager.prototype.trackMetric = function (telemetry) {
        this._addMetric(telemetry);
    };
    /**
     * Add a document to the current buffer
     * @param envelope
     */
    QuickPulseStateManager.prototype.addDocument = function (envelope) {
        // Only add documents in buffer when Live Metrics is collecting data
        if (this._isCollectingData) {
            var document_1 = QuickPulseEnvelopeFactory.telemetryEnvelopeToQuickPulseDocument(envelope);
            if (document_1) {
                this._documents.push(document_1);
            }
        }
    };
    /**
     * Enable or disable communication with QuickPulseService
     * @param isEnabled
     */
    QuickPulseStateManager.prototype.enable = function (isEnabled) {
        if (isEnabled && !this._isEnabled) {
            this._isEnabled = true;
            this._goQuickPulse();
        }
        else if (!isEnabled && this._isEnabled) {
            this._isEnabled = false;
            clearTimeout(this._handle);
            this._handle = undefined;
        }
    };
    /**
     * Enable or disable all collectors in this instance
     * @param enable
     */
    QuickPulseStateManager.prototype.enableCollectors = function (enable) {
        this._collectors.forEach(function (collector) {
            collector.enable(enable);
        });
    };
    /**
     * Add the metric to this buffer. If same metric already exists in this buffer, add weight to it
     * @param telemetry
     */
    QuickPulseStateManager.prototype._addMetric = function (telemetry) {
        var value = telemetry.value;
        var count = telemetry.count || 1;
        var name = Constants.PerformanceToQuickPulseCounter[telemetry.name];
        if (name) {
            if (this._metrics[name]) {
                this._metrics[name].Value = (this._metrics[name].Value * this._metrics[name].Weight + value * count) / (this._metrics[name].Weight + count);
                this._metrics[name].Weight += count;
            }
            else {
                this._metrics[name] = QuickPulseEnvelopeFactory.createQuickPulseMetric(telemetry);
                this._metrics[name].Name = name;
                this._metrics[name].Weight = 1;
            }
        }
    };
    QuickPulseStateManager.prototype._resetQuickPulseBuffer = function () {
        delete this._metrics;
        this._metrics = {};
        this._documents.length = 0;
    };
    QuickPulseStateManager.prototype._goQuickPulse = function () {
        return __awaiter(this, void 0, void 0, function () {
            var metrics, envelope, pingInterval, currentTimeout;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        metrics = Object.keys(this._metrics).map(function (k) { return _this._metrics[k]; });
                        envelope = QuickPulseEnvelopeFactory.createQuickPulseEnvelope(metrics, this._documents.slice(), this.config, this.context);
                        // Clear this document, metric buffer
                        this._resetQuickPulseBuffer();
                        if (!this._isCollectingData) return [3 /*break*/, 2];
                        return [4 /*yield*/, this._post(envelope)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        this._ping(envelope);
                        _a.label = 3;
                    case 3:
                        pingInterval = this._pollingIntervalHint > 0 ? this._pollingIntervalHint : QuickPulseStateManager.PING_INTERVAL;
                        currentTimeout = this._isCollectingData ? QuickPulseStateManager.POST_INTERVAL : pingInterval;
                        if (this._isCollectingData && Date.now() - this._lastSuccessTime >= QuickPulseStateManager.MAX_POST_WAIT_TIME && !this._lastSendSucceeded) {
                            // Haven't posted successfully in 20 seconds, so wait 60 seconds and ping
                            this._isCollectingData = false;
                            currentTimeout = QuickPulseStateManager.FALLBACK_INTERVAL;
                        }
                        else if (!this._isCollectingData && Date.now() - this._lastSuccessTime >= QuickPulseStateManager.MAX_PING_WAIT_TIME && !this._lastSendSucceeded) {
                            // Haven't pinged successfully in 60 seconds, so wait another 60 seconds
                            currentTimeout = QuickPulseStateManager.FALLBACK_INTERVAL;
                        }
                        this._lastSendSucceeded = null;
                        this._handle = setTimeout(this._goQuickPulse.bind(this), currentTimeout);
                        this._handle.unref(); // Don't block apps from terminating
                        return [2 /*return*/];
                }
            });
        });
    };
    QuickPulseStateManager.prototype._ping = function (envelope) {
        this._sender.ping(envelope, this._redirectedHost, this._quickPulseDone.bind(this));
    };
    QuickPulseStateManager.prototype._post = function (envelope) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._sender.post(envelope, this._redirectedHost, this._quickPulseDone.bind(this))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Change the current QPS send state. (shouldPOST == undefined) --> error, but do not change the state yet.
     */
    QuickPulseStateManager.prototype._quickPulseDone = function (shouldPOST, res, redirectedHost, pollingIntervalHint) {
        if (shouldPOST != undefined) {
            if (this._isCollectingData !== shouldPOST) {
                Logging.info("Live Metrics sending data", shouldPOST);
                this.enableCollectors(shouldPOST);
            }
            this._isCollectingData = shouldPOST;
            if (redirectedHost && redirectedHost.length > 0) {
                this._redirectedHost = redirectedHost;
                Logging.info("Redirecting endpoint to: ", redirectedHost);
            }
            if (pollingIntervalHint && pollingIntervalHint > 0) {
                this._pollingIntervalHint = pollingIntervalHint;
            }
            if (res && res.statusCode < 300 && res.statusCode >= 200) {
                this._lastSuccessTime = Date.now();
                this._lastSendSucceeded = true;
            }
            else {
                this._lastSendSucceeded = false;
            }
        }
        else {
            // Received an error, keep the state as is
            this._lastSendSucceeded = false;
        }
    };
    QuickPulseStateManager.MAX_POST_WAIT_TIME = 20000;
    QuickPulseStateManager.MAX_PING_WAIT_TIME = 60000;
    QuickPulseStateManager.FALLBACK_INTERVAL = 60000;
    QuickPulseStateManager.PING_INTERVAL = 5000;
    QuickPulseStateManager.POST_INTERVAL = 1000;
    return QuickPulseStateManager;
}());
module.exports = QuickPulseStateManager;
//# sourceMappingURL=QuickPulseStateManager.js.map