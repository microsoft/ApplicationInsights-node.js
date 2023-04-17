/// <reference types="node" />
import azureCoreAuth = require("@azure/core-auth");
import http = require("http");
import https = require("https");
import { IConfig, IWebInstrumentationConfig } from "../Declarations/Interfaces";
import { DistributedTracingModes } from "../applicationinsights";
import { IDisabledExtendedMetrics } from "../AutoCollection/NativePerformance";
declare class Config implements IConfig {
    static ENV_azurePrefix: string;
    static ENV_iKey: string;
    static legacy_ENV_iKey: string;
    static ENV_profileQueryEndpoint: string;
    static ENV_quickPulseHost: string;
    endpointUrl: string;
    maxBatchSize: number;
    maxBatchIntervalMs: number;
    disableAppInsights: boolean;
    samplingPercentage: number;
    correlationIdRetryIntervalMs: number;
    correlationHeaderExcludedDomains: string[];
    proxyHttpUrl: string;
    proxyHttpsUrl: string;
    httpAgent: http.Agent;
    httpsAgent: https.Agent;
    ignoreLegacyHeaders: boolean;
    aadTokenCredential?: azureCoreAuth.TokenCredential;
    enableAutoCollectConsole: boolean;
    enableAutoCollectExceptions: boolean;
    enableAutoCollectPerformance: boolean;
    enableAutoCollectExternalLoggers: boolean;
    enableAutoCollectPreAggregatedMetrics: boolean;
    enableAutoCollectHeartbeat: boolean;
    enableAutoCollectRequests: boolean;
    enableAutoCollectDependencies: boolean;
    enableAutoDependencyCorrelation: boolean;
    enableAutoCollectIncomingRequestAzureFunctions: boolean;
    enableSendLiveMetrics: boolean;
    enableUseDiskRetryCaching: boolean;
    enableUseAsyncHooks: boolean;
    distributedTracingMode: DistributedTracingModes;
    enableAutoCollectExtendedMetrics: boolean | IDisabledExtendedMetrics;
    enableResendInterval: number;
    enableMaxBytesOnDisk: number;
    enableInternalDebugLogging: boolean;
    enableInternalWarningLogging: boolean;
    disableAllExtendedMetrics: boolean;
    disableStatsbeat: boolean;
    extendedMetricDisablers: string;
    quickPulseHost: string;
    enableWebInstrumentation: boolean;
    webInstrumentationConfig: IWebInstrumentationConfig[];
    webInstrumentationSrc: string;
    enableAutoWebSnippetInjection: boolean;
    correlationId: string;
    private _connectionString;
    private _endpointBase;
    private _profileQueryEndpoint;
    private _instrumentationKey;
    _webInstrumentationConnectionString: string;
    constructor(setupString?: string);
    set profileQueryEndpoint(endpoint: string);
    get profileQueryEndpoint(): string;
    set instrumentationKey(iKey: string);
    get instrumentationKey(): string;
    set webSnippetConnectionString(connectionString: string);
    get webSnippetConnectionString(): string;
    set webInstrumentationConnectionString(connectionString: string);
    get webInstrumentationConnectionString(): string;
    private _mergeConfig;
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
    private static _validateInstrumentationKey;
}
export = Config;
