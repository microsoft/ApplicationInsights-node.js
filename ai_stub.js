// attempt to read configuration from environment variables
var iKeyEnvVariableName = "APPINSIGHTS_INSTRUMENTATION_KEY";
var azureAppSettingPrefix = "APPSETTING_";
var iKey = process.env[iKeyEnvVariableName] || process.env[azureAppSettingPrefix + iKeyEnvVariableName];

if (!iKey || iKey == "") {
    throw new Error("Instrumentation key not found, set the environment variable APPINSIGHTS_INSTRUMENTATION_KEY before starting the server");
}

appInsights = { iKey: iKey };

@DIVIDER@

module.exports = {
    iKey: appInsights.iKey, context: appInsights.context,
    TraceTelemetry: Microsoft.ApplicationInsights.TraceTelemetry,
    ExceptionTelemetry: Microsoft.ApplicationInsights.ExceptionTelemetry,
    RequestTelemetry: Microsoft.ApplicationInsights.RequestTelemetry,
    RequestData: Microsoft.ApplicationInsights.RequestData,
    ExceptionData: Microsoft.ApplicationInsights.ExceptionData,
}