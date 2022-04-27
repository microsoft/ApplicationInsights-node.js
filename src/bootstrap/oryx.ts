import * as types from "../applicationinsights"; // needed but unused
import { StatusLogger } from "./statusLogger";
import { DiagnosticLogger } from "./diagnosticLogger";
import { NoopLogger } from "./noopLogger";
import * as appInsightsLoader from "./default";

appInsightsLoader.setUsagePrefix("alr_"); // App Services Linux Attach

// Set Status.json logger
appInsightsLoader.setStatusLogger(new StatusLogger(new NoopLogger()));

// Set Attach Diagnostic Logger
appInsightsLoader.setLogger(new DiagnosticLogger(new NoopLogger()));

// Start the SDK
var appInsights = appInsightsLoader.setupAndStart();

export = appInsights;
