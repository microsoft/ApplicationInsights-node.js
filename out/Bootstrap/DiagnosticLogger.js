"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticLogger = void 0;
var path = require("path");
var FileHelpers_1 = require("./Helpers/FileHelpers");
var Constants_1 = require("../Declarations/Constants");
var Util = require("../Library/Util");
var LOGGER_NAME = "applicationinsights.extension.diagnostics";
var DiagnosticLogger = /** @class */ (function () {
    function DiagnosticLogger(_writer, instrumentationKey) {
        if (_writer === void 0) { _writer = console; }
        if (instrumentationKey === void 0) { instrumentationKey = "unknown"; }
        this._writer = _writer;
        this._defaultProperties = {
            language: "nodejs",
            operation: "Startup",
            siteName: process.env.WEBSITE_SITE_NAME,
            ikey: "unknown",
            extensionVersion: process.env.ApplicationInsightsAgent_EXTENSION_VERSION,
            sdkVersion: Constants_1.APPLICATION_INSIGHTS_SDK_VERSION,
            subscriptionId: process.env.WEBSITE_OWNER_NAME ? process.env.WEBSITE_OWNER_NAME.split("+")[0] : null
        };
        this._defaultProperties.ikey = instrumentationKey;
    }
    DiagnosticLogger.prototype.logMessage = function (diagnosticLog) {
        var props = Object.assign({}, this._defaultProperties, diagnosticLog.properties);
        var diagnosticMessage = {
            properties: props,
            logger: LOGGER_NAME,
            message: diagnosticLog.message,
            level: "INFO" /* INFO */,
            time: new Date().toUTCString()
        };
        this._writer.log(diagnosticMessage);
    };
    DiagnosticLogger.prototype.logError = function (diagnosticLog) {
        var message = diagnosticLog.message;
        if (diagnosticLog.exception) {
            message += " Error: " + Util.dumpObj(diagnosticLog.exception);
        }
        var props = Object.assign({}, this._defaultProperties, diagnosticLog.properties);
        var diagnosticMessage = {
            properties: props,
            logger: LOGGER_NAME,
            message: message,
            level: "ERROR" /* ERROR */,
            time: new Date().toUTCString()
        };
        this._writer.error(diagnosticMessage);
    };
    DiagnosticLogger.DEFAULT_FILE_NAME = "application-insights-extension.log";
    DiagnosticLogger.DEFAULT_LOG_DIR = process.env.APPLICATIONINSIGHTS_LOGDIR || path.join(FileHelpers_1.homedir, "LogFiles/ApplicationInsights");
    return DiagnosticLogger;
}());
exports.DiagnosticLogger = DiagnosticLogger;
//# sourceMappingURL=DiagnosticLogger.js.map