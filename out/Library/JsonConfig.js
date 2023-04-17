"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonConfig = void 0;
var fs = require("fs");
var path = require("path");
var Logging = require("./Logging");
var ENV_CONFIGURATION_FILE = "APPLICATIONINSIGHTS_CONFIGURATION_FILE";
// Azure Connection String
var ENV_connectionString = "APPLICATIONINSIGHTS_CONNECTION_STRING";
// Instrumentation Key
var ENV_azurePrefix = "APPSETTING_"; // Azure adds this prefix to all environment variables
var ENV_instrumentationKey = "APPINSIGHTS_INSTRUMENTATIONKEY";
var ENV_legacyInstrumentationKey = "APPINSIGHTS_INSTRUMENTATION_KEY";
// Native Metrics Opt Outs
var ENV_nativeMetricsDisablers = "APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC";
var ENV_nativeMetricsDisableAll = "APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS";
var ENV_http_proxy = "http_proxy";
var ENV_https_proxy = "https_proxy";
var ENV_noDiagnosticChannel = "APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL";
var ENV_noStatsbeat = "APPLICATION_INSIGHTS_NO_STATSBEAT";
var ENV_noHttpAgentKeepAlive = "APPLICATION_INSIGHTS_NO_HTTP_AGENT_KEEP_ALIVE";
var ENV_noPatchModules = "APPLICATION_INSIGHTS_NO_PATCH_MODULES";
var ENV_webInstrumentationEnable = "APPLICATIONINSIGHTS_WEB_INSTRUMENTATION_ENABLED";
var ENV_webInstrumentation_connectionString = "APPLICATIONINSIGHTS_WEB_INSTRUMENTATION_CONNECTION_STRING";
var ENV_webInstrumentation_source = "APPLICATIONINSIGHTS_WEB_INSTRUMENTATION_SOURCE";
// Old web instrumentation env variables are to be deprecated
// Those env variables will NOT be exposed in doc after version 2.3.5
var ENV_webSnippetEnable = "APPLICATIONINSIGHTS_WEB_SNIPPET_ENABLED";
var ENV_webSnippet_connectionString = "APPLICATIONINSIGHTS_WEB_SNIPPET_CONNECTION_STRING";
var JsonConfig = /** @class */ (function () {
    function JsonConfig() {
        // Load env variables first
        this.connectionString = process.env[ENV_connectionString];
        this.instrumentationKey = process.env[ENV_instrumentationKey]
            || process.env[ENV_azurePrefix + ENV_instrumentationKey]
            || process.env[ENV_legacyInstrumentationKey]
            || process.env[ENV_azurePrefix + ENV_legacyInstrumentationKey];
        if (!this.connectionString && this.instrumentationKey) {
            Logging.warn("APPINSIGHTS_INSTRUMENTATIONKEY is in path of deprecation, please use APPLICATIONINSIGHTS_CONNECTION_STRING env variable to setup the SDK.");
        }
        this.disableAllExtendedMetrics = !!process.env[ENV_nativeMetricsDisableAll];
        this.extendedMetricDisablers = process.env[ENV_nativeMetricsDisablers];
        this.proxyHttpUrl = process.env[ENV_http_proxy];
        this.proxyHttpsUrl = process.env[ENV_https_proxy];
        this.noDiagnosticChannel = !!process.env[ENV_noDiagnosticChannel];
        this.disableStatsbeat = !!process.env[ENV_noStatsbeat];
        this.noHttpAgentKeepAlive = !!process.env[ENV_noHttpAgentKeepAlive];
        this.noPatchModules = process.env[ENV_noPatchModules] || "";
        this.enableWebInstrumentation = !!process.env[ENV_webInstrumentationEnable] || !!process.env[ENV_webSnippetEnable];
        this.webInstrumentationSrc = process.env[ENV_webInstrumentation_source] || "";
        this.webInstrumentationConnectionString = process.env[ENV_webInstrumentation_connectionString] || process.env[ENV_webSnippet_connectionString] || "";
        this.enableAutoWebSnippetInjection = this.enableWebInstrumentation;
        this.webSnippetConnectionString = this.webInstrumentationConnectionString;
        this._loadJsonFile();
    }
    JsonConfig.getInstance = function () {
        if (!JsonConfig._instance) {
            JsonConfig._instance = new JsonConfig();
        }
        return JsonConfig._instance;
    };
    JsonConfig.prototype._loadJsonFile = function () {
        var configFileName = "applicationinsights.json";
        var rootPath = path.join(__dirname, "../../"); // Root of applicationinsights folder (__dirname = ../out/Library)
        var tempDir = path.join(rootPath, configFileName); // default
        var configFile = process.env[ENV_CONFIGURATION_FILE];
        if (configFile) {
            if (path.isAbsolute(configFile)) {
                tempDir = configFile;
            }
            else {
                tempDir = path.join(rootPath, configFile); // Relative path to applicationinsights folder
            }
        }
        try {
            var jsonConfig = JSON.parse(fs.readFileSync(tempDir, "utf8"));
            if (jsonConfig.disableStatsbeat != undefined) {
                this.disableStatsbeat = jsonConfig.disableStatsbeat;
            }
            if (jsonConfig.disableAllExtendedMetrics != undefined) {
                this.disableAllExtendedMetrics = jsonConfig.disableStatsbeat;
            }
            if (jsonConfig.noDiagnosticChannel != undefined) {
                this.noDiagnosticChannel = jsonConfig.noDiagnosticChannel;
            }
            if (jsonConfig.noHttpAgentKeepAlive != undefined) {
                this.noHttpAgentKeepAlive = jsonConfig.noHttpAgentKeepAlive;
            }
            if (jsonConfig.connectionString != undefined) {
                this.connectionString = jsonConfig.connectionString;
            }
            if (jsonConfig.extendedMetricDisablers != undefined) {
                this.extendedMetricDisablers = jsonConfig.extendedMetricDisablers;
            }
            if (jsonConfig.noDiagnosticChannel != undefined) {
                this.noDiagnosticChannel = jsonConfig.noDiagnosticChannel;
            }
            if (jsonConfig.proxyHttpUrl != undefined) {
                this.proxyHttpUrl = jsonConfig.proxyHttpUrl;
            }
            if (jsonConfig.proxyHttpsUrl != undefined) {
                this.proxyHttpsUrl = jsonConfig.proxyHttpsUrl;
            }
            if (jsonConfig.proxyHttpsUrl != undefined) {
                this.proxyHttpsUrl = jsonConfig.proxyHttpsUrl;
            }
            if (jsonConfig.noPatchModules != undefined) {
                this.noPatchModules = jsonConfig.noPatchModules;
            }
            if (jsonConfig.enableAutoWebSnippetInjection != undefined) {
                this.enableWebInstrumentation = jsonConfig.enableAutoWebSnippetInjection;
                this.enableAutoWebSnippetInjection = this.enableWebInstrumentation;
            }
            if (jsonConfig.enableWebInstrumentation != undefined) {
                this.enableWebInstrumentation = jsonConfig.enableWebInstrumentation;
                this.enableAutoWebSnippetInjection = this.enableWebInstrumentation;
            }
            if (jsonConfig.webSnippetConnectionString != undefined) {
                this.webInstrumentationConnectionString = jsonConfig.webSnippetConnectionString;
                this.webSnippetConnectionString = this.webInstrumentationConnectionString;
            }
            if (jsonConfig.webInstrumentationConnectionString != undefined) {
                this.webInstrumentationConnectionString = jsonConfig.webInstrumentationConnectionString;
                this.webSnippetConnectionString = this.webInstrumentationConnectionString;
            }
            if (jsonConfig.webInstrumentationConfig != undefined) {
                this.webInstrumentationConfig = jsonConfig.webInstrumentationConfig;
            }
            if (jsonConfig.webInstrumentationSrc != undefined) {
                this.webInstrumentationSrc = jsonConfig.webInstrumentationSrc;
            }
            this.endpointUrl = jsonConfig.endpointUrl;
            this.maxBatchSize = jsonConfig.maxBatchSize;
            this.maxBatchIntervalMs = jsonConfig.maxBatchIntervalMs;
            this.disableAppInsights = jsonConfig.disableAppInsights;
            this.samplingPercentage = jsonConfig.samplingPercentage;
            this.correlationIdRetryIntervalMs = jsonConfig.correlationIdRetryIntervalMs;
            this.correlationHeaderExcludedDomains = jsonConfig.correlationHeaderExcludedDomains;
            this.ignoreLegacyHeaders = jsonConfig.ignoreLegacyHeaders;
            this.distributedTracingMode = jsonConfig.distributedTracingMode;
            this.enableAutoCollectExternalLoggers = jsonConfig.enableAutoCollectExternalLoggers;
            this.enableAutoCollectConsole = jsonConfig.enableAutoCollectConsole;
            this.enableAutoCollectExceptions = jsonConfig.enableAutoCollectExceptions;
            this.enableAutoCollectPerformance = jsonConfig.enableAutoCollectPerformance;
            this.enableAutoCollectExtendedMetrics = jsonConfig.enableAutoCollectExtendedMetrics;
            this.enableAutoCollectPreAggregatedMetrics = jsonConfig.enableAutoCollectPreAggregatedMetrics;
            this.enableAutoCollectHeartbeat = jsonConfig.enableAutoCollectHeartbeat;
            this.enableAutoCollectRequests = jsonConfig.enableAutoCollectRequests;
            this.enableAutoCollectDependencies = jsonConfig.enableAutoCollectDependencies;
            this.enableAutoDependencyCorrelation = jsonConfig.enableAutoDependencyCorrelation;
            this.enableAutoCollectIncomingRequestAzureFunctions = jsonConfig.enableAutoCollectIncomingRequestAzureFunctions;
            this.enableUseAsyncHooks = jsonConfig.enableUseAsyncHooks;
            this.enableUseDiskRetryCaching = jsonConfig.enableUseDiskRetryCaching;
            this.enableResendInterval = jsonConfig.enableResendInterval;
            this.enableMaxBytesOnDisk = jsonConfig.enableMaxBytesOnDisk;
            this.enableInternalDebugLogging = jsonConfig.enableInternalDebugLogging;
            this.enableInternalWarningLogging = jsonConfig.enableInternalWarningLogging;
            this.enableSendLiveMetrics = jsonConfig.enableSendLiveMetrics;
            this.quickPulseHost = jsonConfig.quickPulseHost;
        }
        catch (err) {
            Logging.info("Missing or invalid JSON config file: ", err);
        }
    };
    return JsonConfig;
}());
exports.JsonConfig = JsonConfig;
//# sourceMappingURL=JsonConfig.js.map