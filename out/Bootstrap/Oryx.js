"use strict";
var StatusLogger_1 = require("./StatusLogger");
var DiagnosticLogger_1 = require("./DiagnosticLogger");
var NoopLogger_1 = require("./NoopLogger");
var appInsightsLoader = require("./Default");
appInsightsLoader.setUsagePrefix("alr_"); // App Services Linux Attach
// Set Status.json logger
appInsightsLoader.setStatusLogger(new StatusLogger_1.StatusLogger(new NoopLogger_1.NoopLogger()));
// Set Attach Diagnostic Logger
appInsightsLoader.setLogger(new DiagnosticLogger_1.DiagnosticLogger(new NoopLogger_1.NoopLogger()));
// Start the SDK
var appInsights = appInsightsLoader.setupAndStart();
module.exports = appInsights;
//# sourceMappingURL=Oryx.js.map