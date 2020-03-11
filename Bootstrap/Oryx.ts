import * as types from "../applicationinsights";
import { FileWriter } from "./FileWriter";
import { StatusLogger } from "./StatusLogger";
import { DiagnosticLogger } from "./DiagnosticLogger";
import appInsightsLoader = require("./Default");

appInsightsLoader.setUsagePrefix("alr_"); // App Services Linux Attach

// Set Status.json logger
appInsightsLoader.setStatusLogger(new StatusLogger(new FileWriter(
    StatusLogger.DEFAULT_FILE_PATH,
    StatusLogger.DEFAULT_FILE_NAME,
    { deleteOnExit: true, renamePolicy: "stop" }
)));

// Set Attach Diagnostic Logger
appInsightsLoader.setLogger(new DiagnosticLogger(new FileWriter(
    DiagnosticLogger.DEFAULT_LOG_DIR,
    DiagnosticLogger.DEFAULT_FILE_NAME,
    { append: true, deleteOnExit: true, renamePolicy: "stop" }
)));

// Start the SDK
var appInsights = appInsightsLoader.setupAndStart();

export = appInsights;
