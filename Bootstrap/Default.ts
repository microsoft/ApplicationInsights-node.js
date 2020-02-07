import * as types from "../applicationinsights";
import * as StatusLogger from "./StatusLogger";
import * as Helpers from "./Helpers";
import * as DataModel from "./DataModel";

// Private configuration vars
let _appInsights: typeof types | null;
let _logger: DataModel.AgentLogger = console;
let _prefix = "ad_"; // App Services, Default

// Env var local constants
const ENV_extensionVersion = "APPLICATIONINSIGHTS_EXTENSION_VERSION";
const _setupString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || process.env.APPINSIGHTS_INSTRUMENTATION_KEY;
const _extensionEnabled = process.env[ENV_extensionVersion] && process.env[ENV_extensionVersion] !== "disabled";

// Other local constants
const defaultStatus: StatusLogger.StatusContract = {
    ...StatusLogger.DEFAULT_STATUS,
    Ikey: _setupString,
};

/**
 * Sets the attach-time logger
 * @param logger logger which implements the `AgentLogger` interface
 */
export function setLogger(logger: DataModel.AgentLogger) {
    return _logger = logger;
}

/**
 * Sets the string which is prefixed to the exsting sdkVersion, e.g. `ad_`, `alr_`
 * @param prefix string prefix, including underscore. Defaults to `ad_`
 */
export function setUsagePrefix(prefix: string) {
    _prefix = prefix;
}

/**
 * Try to setup and start this app insights instance if attach is enabled.
 * @param setupString connection string or instrumentation key
 */
export function setupAndStart(setupString = _setupString): typeof types | null {
    StatusLogger.makeStatusDirs();
    StatusLogger.addCloseHandler();

    if (!_extensionEnabled) {
        StatusLogger.writeFile({
            ...defaultStatus,
            AgentInitializedSuccessfully: false,
            Reason: `Extension is not enabled. env.${ENV_extensionVersion}=${process.env[ENV_extensionVersion]}`
        });
        return null;
    }

    // If app already contains SDK, skip agent attach
    if (Helpers.sdkAlreadyExists(_logger)) {
        StatusLogger.writeFile({
            ...defaultStatus,
            AgentInitializedSuccessfully: false,
            SDKPresent: true,
            Reason: "SDK already exists"
        })
        return null;
    }

    if (!setupString) {
        const message = "Application Insights wanted to be started, but no Connection String or Instrumentation Key was provided";
        _logger.error(message, setupString);
        StatusLogger.writeFile({
            ...defaultStatus,
            AgentInitializedSuccessfully: false,
            Reason: message,
        });
        return null;
    }

    try {
        _appInsights = require("../applicationinsights");
        const prefixInternalSdkVersion = function (envelope: types.Contracts.Envelope, _contextObjects: Object) {
            try {
                var appInsightsSDKVersion = _appInsights.defaultClient.context.keys.internalSdkVersion;
                envelope.tags[appInsightsSDKVersion] = _prefix + envelope.tags[appInsightsSDKVersion];
            } catch (e) {
                _logger.error("Error prefixing SDK version", e);
            }
            return true;
        }

        // Instrument the SDK
        _appInsights.setup(setupString).setSendLiveMetrics(true);
        _appInsights.defaultClient.addTelemetryProcessor(prefixInternalSdkVersion);
        _appInsights.start();

        // Agent successfully instrumented the SDK
        _logger.log("Application Insights was started with setupString", setupString, _extensionEnabled);
        StatusLogger.writeFile({
            ...defaultStatus,
            AgentInitializedSuccessfully: true
        });
    } catch (e) {
        _logger.error("Error setting up Application Insights", e);
        StatusLogger.writeFile({
            ...defaultStatus,
            AgentInitializedSuccessfully: false,
            Reason: `Error setting up Application Insights: ${e && e.message}`
        })
    }
    return _appInsights;
}
