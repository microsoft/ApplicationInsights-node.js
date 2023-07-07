import { TokenCredential } from "@azure/core-auth";
import { AzureMonitorExporterOptions } from "@azure/monitor-opentelemetry-exporter";
import * as Constants from "../../declarations/constants";
import {
    ENV_AZURE_PREFIX,
    ENV_IKEY,
    ExtendedMetricType,
    IConfig,
    InstrumentationsConfig,
    LEGACY_ENV_IKEY,
    LogInstrumentationsConfig,
    OTLPExporterConfig,
} from "./types";
import { JsonConfig } from "./jsonConfig";
import { Logger } from "../logging";
import {
    Resource,
    ResourceDetectionConfig,
    detectResourcesSync,
    envDetectorSync,
} from "@opentelemetry/resources";

// Azure Connection String
const ENV_connectionString = "APPLICATIONINSIGHTS_CONNECTION_STRING";

export class ApplicationInsightsConfig implements IConfig {
    private _resource: Resource;
    private _azureMonitorExporterConfig: AzureMonitorExporterOptions;
    private _otlpTraceExporterConfig: OTLPExporterConfig;
    private _otlpMetricExporterConfig: OTLPExporterConfig;
    private _instrumentations: InstrumentationsConfig;
    private _logInstrumentations: LogInstrumentationsConfig;
    public samplingRatio: number;
    public enableAutoCollectExceptions: boolean;
    public enableAutoCollectPerformance: boolean;
    public enableAutoCollectStandardMetrics: boolean;
    public extendedMetrics: { [type: string]: boolean };

    /** Connection String used to send telemetry payloads to
     * @deprecated This config should not be used, use azureMonitorExporterConfig to configure Connection String
     */
    public set connectionString(connectionString: string) {
        this._azureMonitorExporterConfig.connectionString = connectionString;
    }
    public get connectionString(): string {
        return this._azureMonitorExporterConfig.connectionString;
    }
    /** AAD TokenCredential to use to authenticate the app
     * @deprecated This config should not be used, use azureMonitorExporterConfig to configure aadTokenCredential
     */
    public set aadTokenCredential(aadTokenCredential: TokenCredential) {
        this._azureMonitorExporterConfig.aadTokenCredential = aadTokenCredential;
    }
    public get aadTokenCredential() {
        return this._azureMonitorExporterConfig.aadTokenCredential;
    }
    /**
     * Disable offline storage when telemetry cannot be exported.
     * @deprecated This config should not be used, use azureMonitorExporterConfig to configure disableOfflineStorage
     */
    public set disableOfflineStorage(disableOfflineStorage: boolean) {
        this._azureMonitorExporterConfig.disableOfflineStorage = disableOfflineStorage;
    }
    public get disableOfflineStorage() {
        return this._azureMonitorExporterConfig.disableOfflineStorage;
    }
    /**
     * Directory to store retriable telemetry when it fails to export.
     * @deprecated This config should not be used, use azureMonitorExporterConfig to configure storageDirectory
     */
    public set storageDirectory(storageDirectory: string) {
        this._azureMonitorExporterConfig.storageDirectory = storageDirectory;
    }
    public get storageDirectory() {
        return this._azureMonitorExporterConfig.storageDirectory;
    }

    constructor() {
        this._azureMonitorExporterConfig = {};
        this._otlpMetricExporterConfig = {};
        this._otlpTraceExporterConfig = {};
        this._instrumentations = {};
        this._logInstrumentations = {};
        this.extendedMetrics = {};
        // Load config values from env variables and JSON if available
        this._azureMonitorExporterConfig.connectionString = process.env[ENV_connectionString];
        this._loadDefaultValues();
        this._mergeConfig();

        if (!this._azureMonitorExporterConfig.connectionString) {
            // Try to build connection string using iKey environment variables
            // check for both the documented env variable and the azure-prefixed variable
            const instrumentationKey = this.getInstrunmentationKeyFromEnv();
            if (instrumentationKey) {
                this.connectionString = `InstrumentationKey=${instrumentationKey};IngestionEndpoint=${Constants.DEFAULT_BREEZE_ENDPOINT}`;
                this._azureMonitorExporterConfig.connectionString = this.connectionString;
            }
        }
    }

    public set resource(resource: Resource) {
        this._resource = this._resource.merge(resource);
    }

    public get resource(): Resource {
        return this._resource;
    }

    public set azureMonitorExporterConfig(value: AzureMonitorExporterOptions) {
        this._azureMonitorExporterConfig = Object.assign(this._azureMonitorExporterConfig, value);
    }

    public get azureMonitorExporterConfig(): AzureMonitorExporterOptions {
        return this._azureMonitorExporterConfig;
    }

    public set otlpTraceExporterConfig(value: OTLPExporterConfig) {
        this._otlpTraceExporterConfig = Object.assign(this._otlpTraceExporterConfig, value);
    }

    public get otlpTraceExporterConfig(): OTLPExporterConfig {
        return this._otlpTraceExporterConfig;
    }

    public set otlpMetricExporterConfig(value: OTLPExporterConfig) {
        this._otlpMetricExporterConfig = Object.assign(this._otlpMetricExporterConfig, value);
    }

    public get otlpMetricExporterConfig(): OTLPExporterConfig {
        return this._otlpMetricExporterConfig;
    }

    public set instrumentations(value: InstrumentationsConfig) {
        this._instrumentations = Object.assign(this._instrumentations, value);
    }

    public get instrumentations(): InstrumentationsConfig {
        return this._instrumentations;
    }

    public set logInstrumentations(value: LogInstrumentationsConfig) {
        this._logInstrumentations = Object.assign(this._logInstrumentations, value);
    }

    public get logInstrumentations(): LogInstrumentationsConfig {
        return this._logInstrumentations;
    }

    /**
     * Get Instrumentation Key
     * @deprecated This method should not be used
     */
    public getInstrumentationKey(): string {
        return "";
    }

    /**
     * Get Instrumentation Key
     * @deprecated This method should not be used
     */
    public getIngestionEndpoint(): string {
        return "";
    }

    /**
     * Get Instrumentation Key
     * @deprecated This method should not be used
     */
    public getDisableStatsbeat(): boolean {
        return false;
    }

    private _loadDefaultValues() {
        this.enableAutoCollectExceptions =
            this.enableAutoCollectExceptions !== undefined
                ? this.enableAutoCollectExceptions
                : true;
        this.enableAutoCollectPerformance =
            this.enableAutoCollectPerformance !== undefined
                ? this.enableAutoCollectPerformance
                : true;
        this.enableAutoCollectStandardMetrics =
            this.enableAutoCollectStandardMetrics !== undefined
                ? this.enableAutoCollectStandardMetrics
                : true;
        this.samplingRatio = this.samplingRatio !== undefined ? this.samplingRatio : 1;
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
        this.extendedMetrics[ExtendedMetricType.gc] = false;
        this.extendedMetrics[ExtendedMetricType.heap] = false;
        this.extendedMetrics[ExtendedMetricType.loop] = false;
        this._resource = this._getDefaultResource();
    }

    private _getDefaultResource(): Resource {
        let resource = Resource.default();
        // Load resource attributes from env
        const detectResourceConfig: ResourceDetectionConfig = {
            detectors: [envDetectorSync],
        };
        const envResource = detectResourcesSync(detectResourceConfig);
        resource = resource.merge(envResource);
        return resource;
    }

    private _mergeConfig() {
        try {
            const jsonConfig = JsonConfig.getInstance();
            this._azureMonitorExporterConfig =
                jsonConfig.azureMonitorExporterConfig !== undefined
                    ? jsonConfig.azureMonitorExporterConfig
                    : this._azureMonitorExporterConfig;
            this.otlpMetricExporterConfig =
                jsonConfig.otlpMetricExporterConfig !== undefined
                    ? jsonConfig.otlpMetricExporterConfig
                    : this.otlpMetricExporterConfig;
            this.otlpTraceExporterConfig =
                jsonConfig.otlpTraceExporterConfig !== undefined
                    ? jsonConfig.otlpTraceExporterConfig
                    : this.otlpTraceExporterConfig;
            this.connectionString =
                jsonConfig.connectionString !== undefined
                    ? jsonConfig.connectionString
                    : this.connectionString;
            this.enableAutoCollectExceptions =
                jsonConfig.enableAutoCollectExceptions !== undefined
                    ? jsonConfig.enableAutoCollectExceptions
                    : this.enableAutoCollectExceptions;
            this.enableAutoCollectPerformance =
                jsonConfig.enableAutoCollectPerformance !== undefined
                    ? jsonConfig.enableAutoCollectPerformance
                    : this.enableAutoCollectPerformance;
            this.enableAutoCollectStandardMetrics =
                jsonConfig.enableAutoCollectStandardMetrics !== undefined
                    ? jsonConfig.enableAutoCollectStandardMetrics
                    : this.enableAutoCollectStandardMetrics;
            this.samplingRatio =
                jsonConfig.samplingRatio !== undefined
                    ? jsonConfig.samplingRatio
                    : this.samplingRatio;
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
