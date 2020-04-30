// Side Effect loader for Application Insights IPA
import * as types from 'applicationinsights'; // needed but unused
import {StatusLogger} from 'applicationinsights/out/Bootstrap/StatusLogger';
import appInsightsLoader = require('./index');

appInsightsLoader.setUsagePrefix('awr_'); // App Services Windows Attach

// Set Status.json logger
appInsightsLoader.setStatusLogger(new StatusLogger(console));

// Set Attach Diagnostic Logger
appInsightsLoader.setLogger(new appInsightsLoader.ETWLogger());

// Start the SDK
const appInsights = appInsightsLoader.setupAndStart();

export = appInsights;
