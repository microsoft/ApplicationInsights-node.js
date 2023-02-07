import * as azureCore from "@azure/core-http";
import { ConnectionStringParser } from "./connectionStringParser";
import * as Constants from "../../declarations/constants";
import {
    ENV_AZURE_PREFIX,
    ENV_IKEY,
    ExtendedMetricType,
    IConfig,
    InstrumentationsConfig,
    LEGACY_ENV_IKEY,
    LogInstrumentationsConfig,
} from "./types";
import { ConnectionString } from "../../declarations/contracts";
import { JsonConfig } from "./jsonConfig";
import { Logger } from "../logging";

// Azure Connection String
const ENV_connectionString = "APPLICATIONINSIGHTS_CONNECTION_STRING";
const ENV_noStatsbeat = "APPLICATION_INSIGHTS_NO_STATSBEAT";

export class ApplicationInsightsConfig implements IConfig {
    public samplingRate: number;
    public aadTokenCredential?: azureCore.TokenCredential;
    public enableAutoCollectExceptions: boolean;
    public enableAutoCollectPerformance: boolean;
    public enableAutoCollectStandardMetrics: boolean;
    public enableAutoCollectHeartbeat: boolean;
    public extendedMetrics: { [type: string]: boolean };
    public instrumentations: InstrumentationsConfig;
    public logInstrumentations: LogInstrumentationsConfig;
    public disableOfflineStorage: boolean;
    public storageDirectory: string;

    private _disableStatsbeat: boolean;
    private _connectionStringParser: ConnectionStringParser;
    private _parsedConnectionString: ConnectionString;
    private _connectionString: string;

    constructor() {
        this._connectionStringParser = new ConnectionStringParser();
        // Load config values from env variables and JSON if available
        this.connectionString = process.env[ENV_connectionString];
        this._disableStatsbeat = !!process.env[ENV_noStatsbeat];
        this._loadDefaultValues();
        this._mergeConfig();

        if (!this.connectionString) {
            // Try to build connection string using iKey environment variables
            // check for both the documented env variable and the azure-prefixed variable
            const instrumentationKey = this.getInstrunmentationKeyFromEnv();
            if (instrumentationKey) {
                this.connectionString = `InstrumentationKey=${instrumentationKey};IngestionEndpoint=${Constants.DEFAULT_BREEZE_ENDPOINT}`;
            }
        }
    }

    public set connectionString(connectionString: string) {
        this._connectionString = connectionString;
        this._parsedConnectionString = this._connectionStringParser.parse(connectionString);
    }

    public get connectionString(): string {
        return this._connectionString;
    }

    public getInstrumentationKey(): string {
        return this._parsedConnectionString?.instrumentationkey;
    }

    public getIngestionEndpoint(): string {
        return this._parsedConnectionString?.ingestionendpoint;
    }

    public getDisableStatsbeat(): boolean {
        return this._disableStatsbeat;
    }

    private _loadDefaultValues() {
        this.enableAutoCollectExceptions =
            this.enableAutoCollectExceptions !== undefined
                ? this.enableAutoCollectExceptions
                : true;
        this.enableAutoCollectHeartbeat =
            this.enableAutoCollectHeartbeat !== undefined ? this.enableAutoCollectHeartbeat : true;
        this.enableAutoCollectPerformance =
            this.enableAutoCollectPerformance !== undefined
                ? this.enableAutoCollectPerformance
                : true;
        this.enableAutoCollectStandardMetrics =
            this.enableAutoCollectStandardMetrics !== undefined
                ? this.enableAutoCollectStandardMetrics
                : true;
        this.samplingRate = this.samplingRate !== undefined ? this.samplingRate : 1;
        this.instrumentations = {
            http: { enabled: true },
            azureSdk: { enabled: false },
            mongoDb: { enabled: false },
            mySql: { enabled: false },
            postgreSql: { enabled: false },
            redis: { enabled: false },
            redis4: { enabled: false },
        };
        this.logInstrumentations = {
            console: { enabled: false },
            bunyan: { enabled: false },
            winston: { enabled: false },
        };
        this.extendedMetrics = {};
        this.extendedMetrics[ExtendedMetricType.gc] = false;
        this.extendedMetrics[ExtendedMetricType.heap] = false;
        this.extendedMetrics[ExtendedMetricType.loop] = false;
    }

    private _mergeConfig() {
        try {
            const jsonConfig = JsonConfig.getInstance();
            this.connectionString =
                jsonConfig.connectionString !== undefined
                    ? jsonConfig.connectionString
                    : this.connectionString;
            this.enableAutoCollectExceptions =
                jsonConfig.enableAutoCollectExceptions !== undefined
                    ? jsonConfig.enableAutoCollectExceptions
                    : this.enableAutoCollectExceptions;
            this.enableAutoCollectHeartbeat =
                jsonConfig.enableAutoCollectHeartbeat !== undefined
                    ? jsonConfig.enableAutoCollectHeartbeat
                    : this.enableAutoCollectHeartbeat;
            this.enableAutoCollectPerformance =
                jsonConfig.enableAutoCollectPerformance !== undefined
                    ? jsonConfig.enableAutoCollectPerformance
                    : this.enableAutoCollectPerformance;
            this.enableAutoCollectStandardMetrics =
                jsonConfig.enableAutoCollectStandardMetrics !== undefined
                    ? jsonConfig.enableAutoCollectStandardMetrics
                    : this.enableAutoCollectStandardMetrics;
            this.samplingRate =
                jsonConfig.samplingRate !== undefined ? jsonConfig.samplingRate : this.samplingRate;
            this.storageDirectory =
                jsonConfig.storageDirectory !== undefined
                    ? jsonConfig.storageDirectory
                    : this.storageDirectory;
            this.disableOfflineStorage =
                jsonConfig.disableOfflineStorage !== undefined
                    ? jsonConfig.disableOfflineStorage
                    : this.disableOfflineStorage;
            if (jsonConfig.instrumentations) {
                if (
                    jsonConfig.instrumentations.azureSdk &&
                    jsonConfig.instrumentations.azureSdk.enabled !== undefined
                ) {
                    this.instrumentations.azureSdk.enabled =
                        jsonConfig.instrumentations.azureSdk.enabled;
                }
                if (
                    jsonConfig.instrumentations.http &&
                    jsonConfig.instrumentations.http.enabled !== undefined
                ) {
                    this.instrumentations.http.enabled = jsonConfig.instrumentations.http.enabled;
                }
                if (
                    jsonConfig.instrumentations.mongoDb &&
                    jsonConfig.instrumentations.mongoDb.enabled !== undefined
                ) {
                    this.instrumentations.mongoDb.enabled =
                        jsonConfig.instrumentations.mongoDb.enabled;
                }
                if (
                    jsonConfig.instrumentations.mySql &&
                    jsonConfig.instrumentations.mySql.enabled !== undefined
                ) {
                    this.instrumentations.mySql.enabled = jsonConfig.instrumentations.mySql.enabled;
                }
                if (
                    jsonConfig.instrumentations.postgreSql &&
                    jsonConfig.instrumentations.postgreSql.enabled !== undefined
                ) {
                    this.instrumentations.postgreSql.enabled =
                        jsonConfig.instrumentations.postgreSql.enabled;
                }
                if (
                    jsonConfig.instrumentations.redis4 &&
                    jsonConfig.instrumentations.redis4.enabled !== undefined
                ) {
                    this.instrumentations.redis4.enabled =
                        jsonConfig.instrumentations.redis4.enabled;
                }
                if (
                    jsonConfig.instrumentations.redis &&
                    jsonConfig.instrumentations.redis.enabled !== undefined
                ) {
                    this.instrumentations.redis.enabled = jsonConfig.instrumentations.redis.enabled;
                }
            }
            if (jsonConfig.logInstrumentations) {
                if (
                    jsonConfig.logInstrumentations.console &&
                    jsonConfig.logInstrumentations.console.enabled !== undefined
                ) {
                    this.logInstrumentations.console.enabled =
                        jsonConfig.logInstrumentations.console.enabled;
                }
                if (
                    jsonConfig.logInstrumentations.bunyan &&
                    jsonConfig.logInstrumentations.bunyan.enabled !== undefined
                ) {
                    this.logInstrumentations.bunyan.enabled =
                        jsonConfig.logInstrumentations.bunyan.enabled;
                }
                if (
                    jsonConfig.logInstrumentations.winston &&
                    jsonConfig.logInstrumentations.winston.enabled !== undefined
                ) {
                    this.logInstrumentations.winston.enabled =
                        jsonConfig.logInstrumentations.winston.enabled;
                }
            }
            if (jsonConfig.extendedMetrics) {
                if (jsonConfig.extendedMetrics[ExtendedMetricType.gc] !== undefined) {
                    this.extendedMetrics[ExtendedMetricType.gc] =
                        jsonConfig.extendedMetrics[ExtendedMetricType.gc];
                }
                if (jsonConfig.extendedMetrics[ExtendedMetricType.heap] !== undefined) {
                    this.extendedMetrics[ExtendedMetricType.heap] =
                        jsonConfig.extendedMetrics[ExtendedMetricType.heap];
                }
                if (jsonConfig.extendedMetrics[ExtendedMetricType.loop] !== undefined) {
                    this.extendedMetrics[ExtendedMetricType.loop] =
                        jsonConfig.extendedMetrics[ExtendedMetricType.loop];
                }
            }
        } catch (error) {
            Logger.getInstance().error("Failed to load JSON config file values.", error);
        }
    }

    private getInstrunmentationKeyFromEnv(): string {
        const iKey =
            process.env[ENV_IKEY] ||
            process.env[ENV_AZURE_PREFIX + ENV_IKEY] ||
            process.env[LEGACY_ENV_IKEY] ||
            process.env[ENV_AZURE_PREFIX + LEGACY_ENV_IKEY];
        return iKey;
    }
}
