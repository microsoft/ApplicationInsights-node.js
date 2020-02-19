import * as types from "../applicationinsights";
import appInsightsLoader = require('./Default');
appInsightsLoader.setUsagePrefix("alr_"); // App Services Linux Attach
var appInsights = appInsightsLoader.setupAndStart();
export = appInsights;
