"use strict";
var CorrelationIdManager = require("./CorrelationIdManager");
var ConnectionStringParser = require("./ConnectionStringParser");
var Logging = require("./Logging");
var Constants = require("../Declarations/Constants");
var url = require("url");
var JsonConfig_1 = require("./JsonConfig");
var Config = /** @class */ (function () {
    function Config(setupString) {
        this._endpointBase = Constants.DEFAULT_BREEZE_ENDPOINT;
        // Load config values from env variables and JSON if available
        this._mergeConfig();
        var connectionStringEnv = this._connectionString;
        var csCode = ConnectionStringParser.parse(setupString);
        var csEnv = ConnectionStringParser.parse(connectionStringEnv);
        var iKeyCode = !csCode.instrumentationkey && Object.keys(csCode).length > 0
            ? null // CS was valid but instrumentation key was not provided, null and grab from env var
            : setupString; // CS was invalid, so it must be an ikey
        var instrumentationKeyEnv = this._instrumentationKey;
        this.instrumentationKey = csCode.instrumentationkey || iKeyCode /* === instrumentationKey */ || csEnv.instrumentationkey || instrumentationKeyEnv;
        var endpoint = "" + (this.endpointUrl || csCode.ingestionendpoint || csEnv.ingestionendpoint || this._endpointBase);
        if (endpoint.endsWith("/")) {
            // Remove extra '/' if present
            endpoint = endpoint.slice(0, -1);
        }
        this.endpointUrl = endpoint + "/v2.1/track";
        this.maxBatchSize = this.maxBatchSize || 250;
        this.maxBatchIntervalMs = this.maxBatchIntervalMs || 15000;
        this.disableAppInsights = this.disableAppInsights || false;
        this.samplingPercentage = this.samplingPercentage || 100;
        this.correlationIdRetryIntervalMs = this.correlationIdRetryIntervalMs || 30 * 1000;
        this.enableWebInstrumentation = this.enableWebInstrumentation || this.enableAutoWebSnippetInjection || false;
        this.webInstrumentationConfig = this.webInstrumentationConfig || null;
        this.enableAutoWebSnippetInjection = this.enableWebInstrumentation;
        this.correlationHeaderExcludedDomains =
            this.correlationHeaderExcludedDomains ||
                [
                    "*.core.windows.net",
                    "*.core.chinacloudapi.cn",
                    "*.core.cloudapi.de",
                    "*.core.usgovcloudapi.net",
                    "*.core.microsoft.scloud",
                    "*.core.eaglex.ic.gov"
                ];
        this.ignoreLegacyHeaders = this.ignoreLegacyHeaders || false;
        this.profileQueryEndpoint = csCode.ingestionendpoint || csEnv.ingestionendpoint || process.env[Config.ENV_profileQueryEndpoint] || this._endpointBase;
        this.quickPulseHost = this.quickPulseHost || csCode.liveendpoint || csEnv.liveendpoint || process.env[Config.ENV_quickPulseHost] || Constants.DEFAULT_LIVEMETRICS_HOST;
        this.webInstrumentationConnectionString = this.webInstrumentationConnectionString || this._webInstrumentationConnectionString || "";
        this.webSnippetConnectionString = this.webInstrumentationConnectionString;
        // Parse quickPulseHost if it starts with http(s)://
        if (this.quickPulseHost.match(/^https?:\/\//)) {
            this.quickPulseHost = new url.URL(this.quickPulseHost).host;
        }
    }
    Object.defineProperty(Config.prototype, "profileQueryEndpoint", {
        get: function () {
            return this._profileQueryEndpoint;
        },
        set: function (endpoint) {
            this._profileQueryEndpoint = endpoint;
            this.correlationId = CorrelationIdManager.correlationIdPrefix;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Config.prototype, "instrumentationKey", {
        get: function () {
            return this._instrumentationKey;
        },
        set: function (iKey) {
            if (!Config._validateInstrumentationKey(iKey)) {
                Logging.warn("An invalid instrumentation key was provided. There may be resulting telemetry loss", this.instrumentationKey);
            }
            this._instrumentationKey = iKey;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Config.prototype, "webSnippetConnectionString", {
        get: function () {
            return this._webInstrumentationConnectionString;
        },
        set: function (connectionString) {
            this._webInstrumentationConnectionString = connectionString;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Config.prototype, "webInstrumentationConnectionString", {
        get: function () {
            return this._webInstrumentationConnectionString;
        },
        set: function (connectionString) {
            this._webInstrumentationConnectionString = connectionString;
        },
        enumerable: false,
        configurable: true
    });
    Config.prototype._mergeConfig = function () {
        var jsonConfig = JsonConfig_1.JsonConfig.getInstance();
        this._connectionString = jsonConfig.connectionString;
        this._instrumentationKey = jsonConfig.instrumentationKey;
        this.correlationHeaderExcludedDomains = jsonConfig.correlationHeaderExcludedDomains;
        this.correlationIdRetryIntervalMs = jsonConfig.correlationIdRetryIntervalMs;
        this.disableAllExtendedMetrics = jsonConfig.disableAllExtendedMetrics;
        this.disableAppInsights = jsonConfig.disableAppInsights;
        this.disableStatsbeat = jsonConfig.disableStatsbeat;
        this.distributedTracingMode = jsonConfig.distributedTracingMode;
        this.enableAutoCollectConsole = jsonConfig.enableAutoCollectConsole;
        this.enableAutoCollectDependencies = jsonConfig.enableAutoCollectDependencies;
        this.enableAutoCollectIncomingRequestAzureFunctions = jsonConfig.enableAutoCollectIncomingRequestAzureFunctions;
        this.enableAutoCollectExceptions = jsonConfig.enableAutoCollectExceptions;
        this.enableAutoCollectExtendedMetrics = jsonConfig.enableAutoCollectExtendedMetrics;
        this.enableAutoCollectExternalLoggers = jsonConfig.enableAutoCollectExternalLoggers;
        this.enableAutoCollectHeartbeat = jsonConfig.enableAutoCollectHeartbeat;
        this.enableAutoCollectPerformance = jsonConfig.enableAutoCollectPerformance;
        this.enableAutoCollectPreAggregatedMetrics = jsonConfig.enableAutoCollectPreAggregatedMetrics;
        this.enableAutoCollectRequests = jsonConfig.enableAutoCollectRequests;
        this.enableAutoDependencyCorrelation = jsonConfig.enableAutoDependencyCorrelation;
        this.enableInternalDebugLogging = jsonConfig.enableInternalDebugLogging;
        this.enableInternalWarningLogging = jsonConfig.enableInternalWarningLogging;
        this.enableResendInterval = jsonConfig.enableResendInterval;
        this.enableMaxBytesOnDisk = jsonConfig.enableMaxBytesOnDisk;
        this.enableSendLiveMetrics = jsonConfig.enableSendLiveMetrics;
        this.enableUseAsyncHooks = jsonConfig.enableUseAsyncHooks;
        this.enableUseDiskRetryCaching = jsonConfig.enableUseDiskRetryCaching;
        this.endpointUrl = jsonConfig.endpointUrl;
        this.extendedMetricDisablers = jsonConfig.extendedMetricDisablers;
        this.ignoreLegacyHeaders = jsonConfig.ignoreLegacyHeaders;
        this.maxBatchIntervalMs = jsonConfig.maxBatchIntervalMs;
        this.maxBatchSize = jsonConfig.maxBatchSize;
        this.proxyHttpUrl = jsonConfig.proxyHttpUrl;
        this.proxyHttpsUrl = jsonConfig.proxyHttpsUrl;
        this.quickPulseHost = jsonConfig.quickPulseHost;
        this.samplingPercentage = jsonConfig.samplingPercentage;
        this.enableWebInstrumentation = jsonConfig.enableWebInstrumentation;
        this._webInstrumentationConnectionString = jsonConfig.webInstrumentationConnectionString;
        this.webInstrumentationConfig = jsonConfig.webInstrumentationConfig;
        this.webInstrumentationSrc = jsonConfig.webInstrumentationSrc;
    };
    /**
    * Validate UUID Format
    * Specs taken from breeze repo
    * The definition of a VALID instrumentation key is as follows:
    * Not none
    * Not empty
    * Every character is a hex character [0-9a-f]
    * 32 characters are separated into 5 sections via 4 dashes
    * First section has 8 characters
    * Second section has 4 characters
    * Third section has 4 characters
    * Fourth section has 4 characters
    * Fifth section has 12 characters
    */
    Config._validateInstrumentationKey = function (iKey) {
        var UUID_Regex = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";
        var regexp = new RegExp(UUID_Regex);
        return regexp.test(iKey);
    };
    Config.ENV_azurePrefix = "APPSETTING_"; // Azure adds this prefix to all environment variables
    Config.ENV_iKey = "APPINSIGHTS_INSTRUMENTATIONKEY"; // This key is provided in the readme
    Config.legacy_ENV_iKey = "APPINSIGHTS_INSTRUMENTATION_KEY";
    Config.ENV_profileQueryEndpoint = "APPINSIGHTS_PROFILE_QUERY_ENDPOINT";
    Config.ENV_quickPulseHost = "APPINSIGHTS_QUICKPULSE_HOST";
    return Config;
}());
module.exports = Config;
//# sourceMappingURL=Config.js.map