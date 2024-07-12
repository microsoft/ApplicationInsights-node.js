import type { TokenCredential } from "@azure/core-auth";
import * as types from "../applicationinsights";
import * as Helpers from "./Helpers";
import Constants = require("../Declarations/Constants");
import { StatusLogger } from "./StatusLogger";
import { DiagnosticLogger } from "./DiagnosticLogger";
import Config = require("../Library/Config");
import { DiagnosticLog, DiagnosticMessageId } from "./DataModel";
import * as PrefixHelpers from "../Library/PrefixHelper";
import Context = require("../Library/Context");
import Logging = require("../Library/Logging");

let azureCoreAuth;
try { 
    azureCoreAuth = require("@azure/core-auth") 
} catch (e) {
    Logging.warn("Cannot load @azure/core-auth package. This package is required for AAD token authentication. It's likely that your node.js version is not supported by the JS Azure SDK.");
};

// Private configuration vars
let _appInsights: typeof types | null;

export const defaultConfig = new Config(); // Will read env variables, expose for Agent initialization
let _prefix = `${PrefixHelpers.getResourceProvider()}${PrefixHelpers.getOsPrefix()}${Constants.AttachTypePrefix.INTEGRATED_AUTO}_`;
let _fullSdkVersion = `${_prefix}node:${Context.sdkVersion}`;
const _instrumentationKey = defaultConfig.instrumentationKey;
let _logger: DiagnosticLogger = new DiagnosticLogger(console, _instrumentationKey);
let _statusLogger: StatusLogger = new StatusLogger(console, _instrumentationKey);

// Env var local constants
const forceStart = process.env.APPLICATIONINSIGHTS_FORCE_START === "true";


/**
 * Sets the attach-time logger
 * @param logger logger which implements the `AgentLogger` interface
 */
export function setLogger(logger: DiagnosticLogger) {
    return _logger = logger;
}

export function setStatusLogger(statusLogger: StatusLogger) {
    _statusLogger = statusLogger;
}

/**
 * Try to setup and start this app insights instance if attach is enabled.
 * @param aadTokenCredential Optional AAD credential
 */
export function setupAndStart(aadTokenCredential?: TokenCredential, isAzureFunction?: boolean): typeof types | null {
    // If app already contains SDK, skip agent attach
    if (!forceStart && Helpers.sdkAlreadyExists(_logger)) {
        _statusLogger.logStatus({
            ...StatusLogger.DEFAULT_STATUS,
            AgentInitializedSuccessfully: false,
            SDKPresent: true,
            Reason: "Application Insights SDK already exists."
        })
        return null;
    }
    if (!defaultConfig.instrumentationKey) {
        const diagnosticLog: DiagnosticLog = {
            message: "Application Insights wanted to be started, but no Connection String was provided",
            properties: {
                "msgId": DiagnosticMessageId.missingIkey
            }
        };
        _logger.logError(diagnosticLog);
        _statusLogger.logStatus({
            ...StatusLogger.DEFAULT_STATUS,
            AgentInitializedSuccessfully: false,
            Reason: diagnosticLog.message
        });
        return null;
    }

    try {
        _appInsights = require("../applicationinsights");
        if (_appInsights.defaultClient) {
            // setupAndStart was already called, return the result
            const diagnosticLog: DiagnosticLog = {
                message: "Setup was attempted on the Application Insights Client multiple times. Aborting and returning the first client instance.",
                properties: {
                    "msgId": DiagnosticMessageId.setupAlreadyCalled
                }
            };
            _logger.logError(diagnosticLog);
            return _appInsights;
        }

        /** Sets the SDK version prefix in auto-attach scenarios */
        const prefixInternalSdkVersion = function (envelope: types.Contracts.Envelope, _contextObjects: Object) {
            // If SDK version prefix is not set - set it using {RP}{OS}{Attach Type}_ pattern
            try {
                envelope.tags[appInsightsSDKVersion] = _fullSdkVersion;
            } catch (e) {
                const diagnosticLog: DiagnosticLog = {
                    message: "Error prefixing SDK version.",
                    exception: e,
                    properties: {
                        "msgId": DiagnosticMessageId.prefixFailed
                    }
                };
                _logger.logError(diagnosticLog);
            }
            return true;
        }

        const copyOverPrefixInternalSdkVersionToHeartBeatMetric = function (envelope: types.Contracts.Envelope, _contextObjects: Object) {
            var appInsightsSDKVersion = _appInsights.defaultClient.context.keys.internalSdkVersion;
            const sdkVersion = envelope.tags[appInsightsSDKVersion] || "";
            if (envelope.name === Constants.HeartBeatMetricName) {
                ((envelope.data as any).baseData).properties = ((envelope.data as any).baseData).properties || {};
                ((envelope.data as any).baseData).properties["sdk"] = sdkVersion;
            }

            return true;
        }

        // Instrument the SDK
        Context.sdkPrefix = _prefix;
        _appInsights.setup();
        const appInsightsSDKVersion = _appInsights.defaultClient.context.keys.internalSdkVersion;

        // Azure Functions
        if (isAzureFunction) {
            // Agent will always run in parallel with Azure Functions .NET Agent, disable requests and exceptions to avoid duplication of telemetry

            // Check if config is not already setup by JSON or env variables
            if (_appInsights.defaultClient.config.enableSendLiveMetrics === undefined) {
                _appInsights.defaultClient.config.enableSendLiveMetrics = false;
            }
            if (_appInsights.defaultClient.config.enableAutoCollectPerformance === undefined) {
                _appInsights.defaultClient.config.enableAutoCollectPerformance = false;
            }
            if (_appInsights.defaultClient.config.enableAutoCollectPreAggregatedMetrics === undefined) {
                _appInsights.defaultClient.config.enableAutoCollectPreAggregatedMetrics = false;
            }
            if (_appInsights.defaultClient.config.enableAutoCollectIncomingRequestAzureFunctions === undefined) {
                _appInsights.defaultClient.config.enableAutoCollectIncomingRequestAzureFunctions = false;
            }
            if (_appInsights.defaultClient.config.enableAutoCollectRequests === undefined) {
                _appInsights.defaultClient.config.enableAutoCollectRequests = false;
            }
            if (_appInsights.defaultClient.config.enableAutoCollectDependencies === undefined) {
                _appInsights.defaultClient.config.enableAutoCollectDependencies = true;
            }
            if (_appInsights.defaultClient.config.enableAutoCollectHeartbeat === undefined) {
                _appInsights.defaultClient.config.enableAutoCollectHeartbeat = true;
            }
            if (_appInsights.defaultClient.config.enableUseDiskRetryCaching === undefined) {
                _appInsights.defaultClient.config.enableUseDiskRetryCaching = true;
            }
        }
        // App Services
        else {
             // Check if config is not already setup by JSON or env variables
             if (_appInsights.defaultClient.config.enableSendLiveMetrics === undefined) {
                _appInsights.defaultClient.config.enableSendLiveMetrics = true;
            }
            if (_appInsights.defaultClient.config.enableAutoCollectPerformance === undefined) {
                _appInsights.defaultClient.config.enableAutoCollectPerformance = true;
            }
            if (_appInsights.defaultClient.config.enableAutoCollectPreAggregatedMetrics === undefined) {
                _appInsights.defaultClient.config.enableAutoCollectPreAggregatedMetrics = true;
            }
            if (_appInsights.defaultClient.config.enableAutoCollectIncomingRequestAzureFunctions === undefined) {
                _appInsights.defaultClient.config.enableAutoCollectIncomingRequestAzureFunctions = false;
            }
            if (_appInsights.defaultClient.config.enableAutoCollectRequests === undefined) {
                _appInsights.defaultClient.config.enableAutoCollectRequests = true;
            }
            if (_appInsights.defaultClient.config.enableAutoCollectDependencies === undefined) {
                _appInsights.defaultClient.config.enableAutoCollectDependencies = true;
            }
            if (_appInsights.defaultClient.config.enableAutoCollectHeartbeat === undefined) {
                _appInsights.defaultClient.config.enableAutoCollectHeartbeat = true;
            }
            if (_appInsights.defaultClient.config.enableUseDiskRetryCaching === undefined) {
                _appInsights.defaultClient.config.enableUseDiskRetryCaching = true;
            }
        }
        _appInsights.defaultClient.addTelemetryProcessor(prefixInternalSdkVersion);
        _appInsights.defaultClient.addTelemetryProcessor(copyOverPrefixInternalSdkVersionToHeartBeatMetric);
        if (aadTokenCredential) {
            const diagnosticLog: DiagnosticLog = {
                message: "Application Insights using AAD Token Credential.",
                properties: {
                    "msgId": DiagnosticMessageId.aadEnabled
                }
            };
            _logger.logMessage(diagnosticLog);
            _appInsights.defaultClient.config.aadTokenCredential = aadTokenCredential;
        }

        _appInsights.start();
        // Set the SDK verison in the context
        _appInsights.defaultClient.context.tags[appInsightsSDKVersion] = _fullSdkVersion;
        // Add attach flag in Statsbeat
        let statsbeat = _appInsights.defaultClient.getStatsbeat();
        if (statsbeat) {
            statsbeat.setCodelessAttach();
        }

        // Agent successfully instrumented the SDK
        const diagnosticLog: DiagnosticLog = {
            message: "Application Insights was started succesfully.",
            properties: {
                "msgId": DiagnosticMessageId.attachSuccessful
            }
        };
        _logger.logMessage(diagnosticLog);
        _statusLogger.logStatus({
            ...StatusLogger.DEFAULT_STATUS,
            AgentInitializedSuccessfully: true
        });
    } catch (e) {
        const diagnosticLog: DiagnosticLog = {
            message: "Error setting up Application Insights.",
            exception: e,
            properties: {
                "msgId": DiagnosticMessageId.unknownError
            }
        };
        _logger.logError(diagnosticLog);
        _statusLogger.logStatus({
            ...StatusLogger.DEFAULT_STATUS,
            AgentInitializedSuccessfully: false,
            Reason: `Error setting up Application Insights: ${e && e.message}`
        })
    }
    return _appInsights;
}

