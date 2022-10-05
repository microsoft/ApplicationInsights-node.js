import * as url from "url";
import * as azureCore from "@azure/core-http";

import { ConnectionStringParser } from "./connectionStringParser";
import { Logger } from "../logging";
import * as Constants from "../../declarations/constants";
import { JsonConfig } from "./jsonConfig";
import { ExtendedMetricType, IConfig, iInstrumentation, InstrumentationType } from "./interfaces";


export class Config implements IConfig {
    // IConfig properties
    public endpointUrl: string;
    public samplingPercentage: number;
    public aadTokenCredential?: azureCore.TokenCredential;
    public enableAutoCollectConsole: boolean;
    public enableAutoCollectExceptions: boolean;
    public enableAutoCollectPerformance: boolean;
    public enableAutoCollectExternalLoggers: boolean;
    public enableAutoCollectPreAggregatedMetrics: boolean;
    public enableAutoCollectHeartbeat: boolean;
    public enableAutoCollectRequests: boolean;
    public enableAutoCollectDependencies: boolean;
    public enableSendLiveMetrics: boolean;
    public disableStatsbeat: boolean;
    public quickPulseHost: string;
    public setupString: string;
    public instrumentations: { [type: string]: iInstrumentation };
    public extendedMetrics: { [type: string]: boolean };

    private _connectionString: string;
    private _endpointBase: string = Constants.DEFAULT_BREEZE_ENDPOINT;
    private _instrumentationKey: string;

    constructor(setupString?: string) {
        this.setupString = setupString;
        // Load config values from env variables and JSON if available
        this._mergeConfig();
        this._loadDefaultValues();
        const connectionStringEnv: string | undefined = this._connectionString;
        let connectionStringPrser = new ConnectionStringParser();
        const csCode = connectionStringPrser.parse(setupString);
        const csEnv = connectionStringPrser.parse(connectionStringEnv);
        const iKeyCode =
            !csCode.instrumentationkey && Object.keys(csCode).length > 0
                ? null // CS was valid but instrumentation key was not provided, null and grab from env var
                : setupString; // CS was invalid, so it must be an ikey

        this.instrumentationKey =
            csCode.instrumentationkey ||
            iKeyCode /* === instrumentationKey */ ||
            csEnv.instrumentationkey ||
            this._getInstrumentationKey();
        this.endpointUrl = `${this.endpointUrl ||
            csCode.ingestionendpoint ||
            csEnv.ingestionendpoint ||
            this._endpointBase
            }/v2.1/track`;
        this.quickPulseHost =
            this.quickPulseHost ||
            csCode.liveendpoint ||
            csEnv.liveendpoint ||
            process.env[Constants.ENV_QUCKPULSE_HOST] ||
            Constants.DEFAULT_LIVEMETRICS_HOST;
        // Parse quickPulseHost if it starts with http(s)://
        if (this.quickPulseHost.match(/^https?:\/\//)) {
            this.quickPulseHost = new url.URL(this.quickPulseHost).host;
        }
    }

    private _loadDefaultValues() {
        this.disableStatsbeat = this.disableStatsbeat != undefined ? this.disableStatsbeat : false;
        this.enableAutoCollectConsole = this.enableAutoCollectConsole != undefined ? this.enableAutoCollectConsole : false;
        this.enableAutoCollectExternalLoggers = this.enableAutoCollectExternalLoggers != undefined ? this.enableAutoCollectExternalLoggers : true;
        this.enableAutoCollectDependencies = this.enableAutoCollectDependencies != undefined ? this.enableAutoCollectDependencies : true;
        this.enableAutoCollectRequests = this.enableAutoCollectRequests != undefined ? this.enableAutoCollectRequests : true;
        this.enableAutoCollectExceptions = this.enableAutoCollectExceptions != undefined ? this.enableAutoCollectExceptions : true;
        this.enableAutoCollectHeartbeat = this.enableAutoCollectHeartbeat != undefined ? this.enableAutoCollectHeartbeat : true;
        this.enableAutoCollectPerformance = this.enableAutoCollectPerformance != undefined ? this.enableAutoCollectPerformance : true;
        this.enableAutoCollectPreAggregatedMetrics = this.enableAutoCollectPreAggregatedMetrics != undefined ? this.enableAutoCollectPreAggregatedMetrics : true;
        this.enableSendLiveMetrics = this.enableSendLiveMetrics != undefined ? this.enableSendLiveMetrics : false;
        this.samplingPercentage = this.samplingPercentage != undefined ? this.samplingPercentage : 100;
        if (!this.instrumentations) {
            this.instrumentations = {};
            this.instrumentations[InstrumentationType.azureSdk] = { enabled: false };
            this.instrumentations[InstrumentationType.mongoDb] = { enabled: false };
            this.instrumentations[InstrumentationType.mySql] = { enabled: false };
            this.instrumentations[InstrumentationType.postgreSql] = { enabled: false };
            this.instrumentations[InstrumentationType.redis] = { enabled: false };
            this.instrumentations[InstrumentationType.redis4] = { enabled: false };
        }
        if (!this.extendedMetrics) {
            this.extendedMetrics = {};
            this.extendedMetrics[ExtendedMetricType.gc] = false;
            this.extendedMetrics[ExtendedMetricType.heap] = false;
            this.extendedMetrics[ExtendedMetricType.loop] = false;
        }
    }

    public set instrumentationKey(iKey: string) {
        if (!this._validateInstrumentationKey(iKey)) {
            Logger.getInstance().warn(
                "An invalid instrumentation key was provided. There may be resulting telemetry loss",
                this.instrumentationKey
            );
        }
        this._instrumentationKey = iKey;
    }

    public get instrumentationKey(): string {
        return this._instrumentationKey;
    }

    public getConnectionString(): string {
        let ingestionEndpoint = this.endpointUrl.replace("/v2.1/track", "");
        let connectionString = `InstrumentationKey=${this.instrumentationKey};IngestionEndpoint=${ingestionEndpoint}`;
        return connectionString;
    }

    private _mergeConfig() {
        let jsonConfig = JsonConfig.getInstance();
        this._connectionString = jsonConfig.connectionString;
        this.disableStatsbeat = jsonConfig.disableStatsbeat;
        this.enableAutoCollectConsole = jsonConfig.enableAutoCollectConsole;
        this.enableAutoCollectDependencies = jsonConfig.enableAutoCollectDependencies;
        this.enableAutoCollectExceptions = jsonConfig.enableAutoCollectExceptions;
        this.enableAutoCollectExternalLoggers = jsonConfig.enableAutoCollectExternalLoggers;
        this.enableAutoCollectHeartbeat = jsonConfig.enableAutoCollectHeartbeat;
        this.enableAutoCollectPerformance = jsonConfig.enableAutoCollectPerformance;
        this.enableAutoCollectPreAggregatedMetrics = jsonConfig.enableAutoCollectPreAggregatedMetrics;
        this.enableAutoCollectRequests = jsonConfig.enableAutoCollectRequests;
        this.enableSendLiveMetrics = jsonConfig.enableSendLiveMetrics;
        this.endpointUrl = jsonConfig.endpointUrl;
        this.quickPulseHost = jsonConfig.quickPulseHost;
        this.samplingPercentage = jsonConfig.samplingPercentage;
        this.instrumentations = jsonConfig.instrumentations;
        this.extendedMetrics = jsonConfig.extendedMetrics;
    }

    private _getInstrumentationKey(): string {
        // check for both the documented env variable and the azure-prefixed variable
        var iKey =
            process.env[Constants.ENV_IKEY] ||
            process.env[Constants.ENV_AZURE_PREFIX + Constants.ENV_IKEY] ||
            process.env[Constants.LEGACY_ENV_IKEY] ||
            process.env[Constants.ENV_AZURE_PREFIX + Constants.LEGACY_ENV_IKEY];
        return iKey;
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
    private _validateInstrumentationKey(iKey: string): boolean {
        const UUID_Regex = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";
        const regexp = new RegExp(UUID_Regex);
        return regexp.test(iKey);
    }
}
