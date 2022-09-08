import azureCore = require("@azure/core-http");

import * as types from "../applicationinsights";
import Constants = require("../Declarations/Constants");
import { StatusLogger } from "./StatusLogger";
import { DiagnosticLogger } from "./DiagnosticLogger";
import Config = require("../Library/Config");
import { DiagnosticLog, DiagnosticMessageId } from "./DataModel";

// Private configuration vars
let _appInsights: typeof types | null;
let _prefix = "ad_"; // App Services, Default

export const defaultConfig = new Config(); // Will read env variables, expose for Agent initialization
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

/**
 * Sets the string which is prefixed to the existing sdkVersion, e.g. `ad_`, `alr_`
 * @param prefix string prefix, including underscore. Defaults to `ad_`
 */
export function setUsagePrefix(prefix: string) {
    _prefix = prefix;
}

export function setStatusLogger(statusLogger: StatusLogger) {
    _statusLogger = statusLogger;
}

/**
 * Try to setup and start this app insights instance if attach is enabled.
 * @param aadTokenCredential Optional AAD credential
 */
export function setupAndStart(aadTokenCredential?: azureCore.TokenCredential): typeof types | null {
    // If app already contains SDK, skip agent attach
    if (!forceStart && sdkAlreadyExists()) {
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

        const prefixInternalSdkVersion = function (envelope: types.Contracts.Envelope, _contextObjects: Object) {
            try {
                var appInsightsSDKVersion = _appInsights.defaultClient.context.keys.internalSdkVersion;
                envelope.tags[appInsightsSDKVersion] = _prefix + envelope.tags[appInsightsSDKVersion];
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
        _appInsights.setup().setSendLiveMetrics(true);
        _appInsights.defaultClient.setAutoPopulateAzureProperties(true);
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

export function sdkAlreadyExists(): boolean {
    try {
        // appInstance should either resolve to user SDK or crash. If it resolves to attach SDK, user probably modified their NODE_PATH
        let appInstance: string;
        try {
            // Node 8.9+
            appInstance = (require.resolve as any)("applicationinsights", { paths: [process.cwd()] });
        } catch (e) {
            // Node <8.9
            appInstance = require.resolve(process.cwd() + "/node_modules/applicationinsights");
        }
        // If loaded instance is in Azure machine home path do not attach the SDK, this means customer already instrumented their app
        if (appInstance.indexOf("home") > -1) {
            const diagnosticLog: DiagnosticLog = {
                message: "Application Insights SDK already exists. Module is already installed in this application; not re-attaching. Installed SDK location: " + appInstance,
                properties: {
                    "msgId": DiagnosticMessageId.sdkExists
                }
            };
            _logger.logError(diagnosticLog);
            return true;
        }
        else {
            // ApplicationInsights could be loaded outside of customer application, attach in this case
            return false;
        }
    } catch (e) {
        // crashed while trying to resolve "applicationinsights", so SDK does not exist. Attach appinsights
        return false;
    }
}

