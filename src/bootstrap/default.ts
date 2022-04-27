import * as azureCore from "@azure/core-http";

import * as types from "../applicationinsights";
import * as Helpers from "./helpers";
import { StatusLogger, StatusContract, DEFAULT_STATUS_CONTRACT } from "./statusLogger";
import { DiagnosticLogger } from "./diagnosticLogger";
import { JsonConfig } from "../library/configuration";
import { KnownContextTagKeys } from "../declarations/generated";

// Private configuration vars
let _appInsights: typeof types | null;
let _prefix = "ad_"; // App Services, Default
let _logger: DiagnosticLogger = new DiagnosticLogger(console);
let _statusLogger: StatusLogger = new StatusLogger(console);

// Env var local constants
const _setupString =
  JsonConfig.getInstance().connectionString || process.env.APPINSIGHTS_INSTRUMENTATIONKEY;
const forceStart = process.env.APPLICATIONINSIGHTS_FORCE_START === "true";

// Other local constants
const defaultStatus: StatusContract = {
  ...DEFAULT_STATUS_CONTRACT,
  Ikey: _setupString,
};

/**
 * Sets the attach-time logger
 * @param logger logger which implements the `AgentLogger` interface
 */
export function setLogger(logger: DiagnosticLogger) {
  return (_logger = logger);
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
 * @param setupString connection string or instrumentation key
 */
export function setupAndStart(
  setupString = _setupString,
  aadTokenCredential?: azureCore.TokenCredential
): typeof types | null {
  // If app already contains SDK, skip agent attach
  if (!forceStart && Helpers.sdkAlreadyExists(_logger)) {
    _statusLogger.logStatus({
      ...defaultStatus,
      AgentInitializedSuccessfully: false,
      SDKPresent: true,
      Reason: "SDK already exists",
    });
    return null;
  }

  if (!setupString) {
    const message =
      "Application Insights wanted to be started, but no Connection String or Instrumentation Key was provided";
    _logger.logError(message);
    _statusLogger.logStatus({
      ...defaultStatus,
      AgentInitializedSuccessfully: false,
      Reason: message,
    });
    return null;
  }

  try {
    _appInsights = require("../applicationinsights");
    if (_appInsights.defaultClient) {
      // setupAndStart was already called, return the result
      _logger.logError(
        "Setup was attempted on the Application Insights Client multiple times. Aborting and returning the first client instance"
      );
      return _appInsights;
    }
    // Instrument the SDK
    _appInsights.setup(setupString).setSendLiveMetrics(true);
    _appInsights.defaultClient.setAutoPopulateAzureProperties();
    // Add internal SDK version prefix
    try {
      let contextTags = _appInsights.defaultClient.context.tags;
      contextTags[KnownContextTagKeys.AiInternalSdkVersion] =
        _prefix + contextTags[KnownContextTagKeys.AiInternalSdkVersion];
    } catch (e) {
      _logger.logError("Error prefixing SDK version", e);
    }

    if (aadTokenCredential) {
      _logger.logMessage("Using AAD Token Credential");
      _appInsights.defaultClient.config.aadTokenCredential = aadTokenCredential;
    }

    _appInsights.start();
    // Add attach flag in Statsbeat
    let statsbeat = _appInsights.defaultClient.getStatsbeat();
    if (statsbeat) {
      statsbeat.setCodelessAttach();
    }

    // Agent successfully instrumented the SDK
    _logger.logMessage("Application Insights was started with setupString: " + setupString);
    _statusLogger.logStatus({
      ...defaultStatus,
      AgentInitializedSuccessfully: true,
    });
  } catch (e) {
    _logger.logError("Error setting up Application Insights", e);
    _statusLogger.logStatus({
      ...defaultStatus,
      AgentInitializedSuccessfully: false,
      Reason: `Error setting up Application Insights: ${e && e.message}`,
    });
  }
  return _appInsights;
}
