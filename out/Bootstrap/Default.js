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
exports.setupAndStart = exports.setStatusLogger = exports.setUsagePrefix = exports.setLogger = exports.defaultConfig = void 0;
var Helpers = require("./Helpers");
var Constants = require("../Declarations/Constants");
var StatusLogger_1 = require("./StatusLogger");
var DiagnosticLogger_1 = require("./DiagnosticLogger");
var Config = require("../Library/Config");
var DataModel_1 = require("./DataModel");
// Private configuration vars
var _appInsights;
var _prefix = "ud_"; // Unknown, Default
exports.defaultConfig = new Config(); // Will read env variables, expose for Agent initialization
var _instrumentationKey = exports.defaultConfig.instrumentationKey;
var _logger = new DiagnosticLogger_1.DiagnosticLogger(console, _instrumentationKey);
var _statusLogger = new StatusLogger_1.StatusLogger(console, _instrumentationKey);
// Env var local constants
var forceStart = process.env.APPLICATIONINSIGHTS_FORCE_START === "true";
/**
 * Sets the attach-time logger
 * @param logger logger which implements the `AgentLogger` interface
 */
function setLogger(logger) {
    return _logger = logger;
}
exports.setLogger = setLogger;
/**
 * Sets the string which is prefixed to the existing sdkVersion, e.g. `ad_`, `alr_`
 * @param prefix string prefix, including underscore. Defaults to `ud_`
 */
function setUsagePrefix(prefix) {
    _prefix = prefix;
}
exports.setUsagePrefix = setUsagePrefix;
function setStatusLogger(statusLogger) {
    _statusLogger = statusLogger;
}
exports.setStatusLogger = setStatusLogger;
/**
 * Try to setup and start this app insights instance if attach is enabled.
 * @param aadTokenCredential Optional AAD credential
 */
function setupAndStart(aadTokenCredential, isAzureFunction) {
    // If app already contains SDK, skip agent attach
    if (!forceStart && Helpers.sdkAlreadyExists(_logger)) {
        _statusLogger.logStatus(__assign(__assign({}, StatusLogger_1.StatusLogger.DEFAULT_STATUS), { AgentInitializedSuccessfully: false, SDKPresent: true, Reason: "Application Insights SDK already exists." }));
        return null;
    }
    if (!exports.defaultConfig.instrumentationKey) {
        var diagnosticLog = {
            message: "Application Insights wanted to be started, but no Connection String was provided",
            properties: {
                "msgId": DataModel_1.DiagnosticMessageId.missingIkey
            }
        };
        _logger.logError(diagnosticLog);
        _statusLogger.logStatus(__assign(__assign({}, StatusLogger_1.StatusLogger.DEFAULT_STATUS), { AgentInitializedSuccessfully: false, Reason: diagnosticLog.message }));
        return null;
    }
    try {
        _appInsights = require("../applicationinsights");
        if (_appInsights.defaultClient) {
            // setupAndStart was already called, return the result
            var diagnosticLog_1 = {
                message: "Setup was attempted on the Application Insights Client multiple times. Aborting and returning the first client instance.",
                properties: {
                    "msgId": DataModel_1.DiagnosticMessageId.setupAlreadyCalled
                }
            };
            _logger.logError(diagnosticLog_1);
            return _appInsights;
        }
        var prefixInternalSdkVersion = function (envelope, _contextObjects) {
            try {
                var appInsightsSDKVersion = _appInsights.defaultClient.context.keys.internalSdkVersion;
                envelope.tags[appInsightsSDKVersion] = _prefix + envelope.tags[appInsightsSDKVersion];
            }
            catch (e) {
                var diagnosticLog_2 = {
                    message: "Error prefixing SDK version.",
                    exception: e,
                    properties: {
                        "msgId": DataModel_1.DiagnosticMessageId.prefixFailed
                    }
                };
                _logger.logError(diagnosticLog_2);
            }
            return true;
        };
        var copyOverPrefixInternalSdkVersionToHeartBeatMetric = function (envelope, _contextObjects) {
            var appInsightsSDKVersion = _appInsights.defaultClient.context.keys.internalSdkVersion;
            var sdkVersion = envelope.tags[appInsightsSDKVersion] || "";
            if (envelope.name === Constants.HeartBeatMetricName) {
                (envelope.data.baseData).properties = (envelope.data.baseData).properties || {};
                (envelope.data.baseData).properties["sdk"] = sdkVersion;
            }
            return true;
        };
        // Instrument the SDK
        // Azure Functions
        if (isAzureFunction) {
            // Agent will always run in parallel with Azure Functions .NET Agent, disable requests and exceptions to avoid duplication of telemetry
            _appInsights.setup().setSendLiveMetrics(false)
                .setAutoCollectPerformance(false)
                .setAutoCollectPreAggregatedMetrics(false)
                .setAutoCollectIncomingRequestAzureFunctions(false)
                .setAutoCollectRequests(false)
                .setAutoCollectExceptions(false)
                .setAutoCollectDependencies(true)
                .setAutoCollectHeartbeat(true)
                .setUseDiskRetryCaching(true);
        }
        // App Services
        else {
            _appInsights.setup().setSendLiveMetrics(true)
                .setAutoCollectPerformance(true)
                .setAutoCollectPreAggregatedMetrics(true)
                .setAutoCollectIncomingRequestAzureFunctions(false)
                .setAutoCollectRequests(true)
                .setAutoCollectDependencies(true)
                .setAutoCollectExceptions(true)
                .setAutoCollectHeartbeat(true)
                .setUseDiskRetryCaching(true);
        }
        _appInsights.defaultClient.setAutoPopulateAzureProperties(true);
        _appInsights.defaultClient.addTelemetryProcessor(prefixInternalSdkVersion);
        _appInsights.defaultClient.addTelemetryProcessor(copyOverPrefixInternalSdkVersionToHeartBeatMetric);
        if (aadTokenCredential) {
            var diagnosticLog_3 = {
                message: "Application Insights using AAD Token Credential.",
                properties: {
                    "msgId": DataModel_1.DiagnosticMessageId.aadEnabled
                }
            };
            _logger.logMessage(diagnosticLog_3);
            _appInsights.defaultClient.config.aadTokenCredential = aadTokenCredential;
        }
        _appInsights.start();
        // Add attach flag in Statsbeat
        var statsbeat = _appInsights.defaultClient.getStatsbeat();
        if (statsbeat) {
            statsbeat.setCodelessAttach();
        }
        // Agent successfully instrumented the SDK
        var diagnosticLog = {
            message: "Application Insights was started succesfully.",
            properties: {
                "msgId": DataModel_1.DiagnosticMessageId.attachSuccessful
            }
        };
        _logger.logMessage(diagnosticLog);
        _statusLogger.logStatus(__assign(__assign({}, StatusLogger_1.StatusLogger.DEFAULT_STATUS), { AgentInitializedSuccessfully: true }));
    }
    catch (e) {
        var diagnosticLog = {
            message: "Error setting up Application Insights.",
            exception: e,
            properties: {
                "msgId": DataModel_1.DiagnosticMessageId.unknownError
            }
        };
        _logger.logError(diagnosticLog);
        _statusLogger.logStatus(__assign(__assign({}, StatusLogger_1.StatusLogger.DEFAULT_STATUS), { AgentInitializedSuccessfully: false, Reason: "Error setting up Application Insights: " + (e && e.message) }));
    }
    return _appInsights;
}
exports.setupAndStart = setupAndStart;
//# sourceMappingURL=Default.js.map