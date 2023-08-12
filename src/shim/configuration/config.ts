import { DistributedTracingModes, IConfig, IDisabledExtendedMetrics, IWebInstrumentationConfig } from "../types";
import http = require("http");
import https = require("https");
import azureCoreAuth = require("@azure/core-auth");
import { Logger } from "../logging";

class config implements IConfig {

    public static ENV_azurePrefix = "APPSETTING_"; // Azure adds this prefix to all environment variables
    public static ENV_iKey = "APPINSIGHTS_INSTRUMENTATIONKEY"; // This key is provided in the readme
    public static legacy_ENV_iKey = "APPINSIGHTS_INSTRUMENTATION_KEY";
    public static ENV_profileQueryEndpoint = "APPINSIGHTS_PROFILE_QUERY_ENDPOINT";
    public static ENV_quickPulseHost = "APPINSIGHTS_QUICKPULSE_HOST";

    public endpointUrl: string;
    public maxBatchSize: number;
    public maxBatchIntervalMs: number;
    public disableAppInsights: boolean;
    public samplingPercentage: number;
    public correlationIdRetryIntervalMs: number;
    public correlationHeaderExcludedDomains: string[];
    public proxyHttpUrl: string;
    public proxyHttpsUrl: string;
    public httpAgent: http.Agent;
    public httpsAgent: https.Agent;
    public ignoreLegacyHeaders: boolean;
    public aadTokenCredential?: azureCoreAuth.TokenCredential;
    public enableAutoCollectConsole: boolean;
    public enableLoggerErrorToTrace: boolean;
    public enableAutoCollectExceptions: boolean;
    public enableAutoCollectPerformance: boolean;
    public enableAutoCollectExternalLoggers: boolean;
    public enableAutoCollectPreAggregatedMetrics: boolean;
    public enableAutoCollectHeartbeat: boolean;
    public enableAutoCollectRequests: boolean;
    public enableAutoCollectDependencies: boolean;
    public enableAutoDependencyCorrelation: boolean;
    public enableAutoCollectIncomingRequestAzureFunctions: boolean;
    public enableSendLiveMetrics: boolean;
    public enableUseDiskRetryCaching: boolean;
    public enableUseAsyncHooks: boolean;
    public distributedTracingMode: DistributedTracingModes;

    public enableAutoCollectExtendedMetrics: boolean | IDisabledExtendedMetrics;
    public enableResendInterval: number;
    public enableMaxBytesOnDisk: number;
    public enableInternalDebugLogging: boolean;
    public enableInternalWarningLogging: boolean;
    public disableAllExtendedMetrics: boolean;
    public disableStatsbeat: boolean; // TODO: Implement this as a way to shutoff statsbeat
    public extendedMetricDisablers: string;
    public quickPulseHost: string; // TODO: This is not noted in the README
    public enableWebInstrumentation: boolean;
    public webInstrumentationConfig: IWebInstrumentationConfig[];
    public webInstrumentationSrc: string;
    public noPatchModules: string;
    public noHttpAgentKeepAlive: boolean;
    
    // To Be deprecated.
    public enableAutoWebSnippetInjection: boolean;

    public correlationId: string; // TODO: Should be private NOTE: This is not noted in the README

    private _instrumentationKey: string;
    public _webInstrumentationConnectionString: string;

    // Added to maintain parity between JSON config and setting manually in the shim
    public noDiagnosticChannel: boolean;

    constructor(setupString?: string) {
        this.instrumentationKey = setupString;
        // this.enableWebInstrumentation = this.enableWebInstrumentation || this.enableAutoWebSnippetInjection || false;
        this.webInstrumentationConfig = this.webInstrumentationConfig || null;
        // this.enableAutoWebSnippetInjection = this.enableWebInstrumentation;
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

        this.ignoreLegacyHeaders = true;
        this.webInstrumentationConnectionString = this.webInstrumentationConnectionString || this._webInstrumentationConnectionString || "";
        this.webSnippetConnectionString = this.webInstrumentationConnectionString;
    }

    public set instrumentationKey(iKey: string) {
        if (!config._validateInstrumentationKey(iKey)) {
            Logger.getInstance().warn("An invalid instrumentation key was provided. There may be resulting telemetry loss", this.instrumentationKey);
        }
        this._instrumentationKey = iKey;
    }

    public get instrumentationKey(): string {
        return this._instrumentationKey;
    }

    public set webSnippetConnectionString(connectionString: string) {
        this._webInstrumentationConnectionString = connectionString;
    }

    public get webSnippetConnectionString(): string {
        return this._webInstrumentationConnectionString;
    }

    public set webInstrumentationConnectionString(connectionString: string) {
        this._webInstrumentationConnectionString = connectionString;
    }

    public get webInstrumentationConnectionString() {
        return this._webInstrumentationConnectionString;
    }

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
    private static _validateInstrumentationKey(iKey: string): boolean {
        const UUID_Regex = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";
        const regexp = new RegExp(UUID_Regex);
        return regexp.test(iKey);
    }
}

export = config;