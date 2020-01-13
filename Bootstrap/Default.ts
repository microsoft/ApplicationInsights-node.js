import * as types from "../applicationinsights";

// Private configuration vars
let _appInsights: typeof types | null;
let _logger: AgentLogger = console;
let _prefix = "ad_"; // App Services, Default

// Env var local constants
const _setupString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || process.env.APPINSIGHTS_INSTRUMENTATION_KEY;
const _extensionEnabled = process.env.APPLICATIONINSIGHTS_EXTENSION_VERSION && process.env.APPLICATIONINSIGHTS_EXTENSION_VERSION !== "disabled";

export interface AgentLogger {
    log(message?: any, ...optional: any[]): void;
    error(message?: any, ...optional: any[]): void;
}

function sdkAlreadyExists(): boolean {
    try {
        // appInstance should either resolve to user SDK or crash. If it resolves to attach SDK, user probably modified their NODE_PATH
        const appInstance = require.resolve("applicationinsights"); // assumes that the cwd is near user's package.json
        const attachInstance = require.resolve("../applicationinsights");
        if (appInstance !== attachInstance) {
            _logger.log(
                "applicationinsights module is already installed in this application; not re-attaching. Installed SDK location:",
                appInstance
            );
            return true;
        }
        // User probably modified their NODE_PATH to resolve to this instance. Attach appinsights
        return false;
    } catch (e) {
        // crashed while trying to resolve "applicationinsights", so SDK does not exist. Attach appinsights
        return false;
    }
}

/**
 * Sets the attach-time logger
 * @param logger logger which implements the `AgentLogger` interface
 */
export function setLogger(logger: AgentLogger) {
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
 * Try to setup and start this app insights instance, if attach is enabled.
 * @param setupString connection string or instrumentation key
 */
export function setupAndStart(setupString = _setupString): typeof types | null {
    if (!_extensionEnabled && sdkAlreadyExists() === false) {
        return null;
    }
    if (!setupString) {
        _logger.error(
            "Application Insights wanted to be started, but no Connection String or Instrumentation Key was provided",
            setupString
        );
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
        _appInsights.setup(setupString).setSendLiveMetrics(true);
        _appInsights.defaultClient.addTelemetryProcessor(prefixInternalSdkVersion);
        _appInsights.start();
        _logger.log("Application Insights was started with setupString", setupString, _extensionEnabled);
    } catch (e) {
        _logger.error("Error setting up Application Insights", e);
    }
    return _appInsights;
}
