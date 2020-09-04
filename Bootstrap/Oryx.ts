import * as types from "../applicationinsights"; // needed but unused
import { StatusLogger } from "./StatusLogger";
import { DiagnosticLogger } from "./DiagnosticLogger";
import { NoopLogger } from "./NoopLogger";
import appInsightsLoader = require("./Default");

appInsightsLoader.setUsagePrefix("alr_"); // App Services Linux Attach

// Set Status.json logger
appInsightsLoader.setStatusLogger(new StatusLogger(new NoopLogger()));

// Set Attach Diagnostic Logger
appInsightsLoader.setLogger(new DiagnosticLogger(new NoopLogger()));

// Start the SDK
var appInsights = appInsightsLoader.setupAndStart();

export = appInsights;
