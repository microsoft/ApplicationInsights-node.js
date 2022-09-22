import * as fs from "fs";
import * as path from "path";
import { Logger } from "../logging";
import { IDisabledExtendedMetrics, iInstrumentation, IJsonConfig } from "./interfaces";

const ENV_CONFIGURATION_FILE = "APPLICATIONINSIGHTS_CONFIGURATION_FILE";
// Azure Connection String
const ENV_connectionString = "APPLICATIONINSIGHTS_CONNECTION_STRING";
// Native Metrics Opt Outs
const ENV_nativeMetricsDisablers = "APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC";
const ENV_nativeMetricsDisableAll = "APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS";
const ENV_noStatsbeat = "APPLICATION_INSIGHTS_NO_STATSBEAT";

export class JsonConfig implements IJsonConfig {
    private static _instance: JsonConfig;

    public connectionString: string;
    public instrumentationKey: string;
    public endpointUrl: string;
    public samplingPercentage: number;
    public enableAutoCollectExternalLoggers: boolean;
    public enableAutoCollectConsole: boolean;
    public enableAutoCollectExceptions: boolean;
    public enableAutoCollectPerformance: boolean;
    public enableAutoCollectExtendedMetrics: boolean | IDisabledExtendedMetrics;
    public enableAutoCollectPreAggregatedMetrics: boolean;
    public enableAutoCollectHeartbeat: boolean;
    public enableAutoCollectRequests: boolean;
    public enableAutoCollectDependencies: boolean;
    public enableSendLiveMetrics: boolean;
    public disableAllExtendedMetrics: boolean;
    public extendedMetricDisablers: string;
    public disableStatsbeat: boolean;
    public quickPulseHost: string;
    public instrumentations: { [type: string]: iInstrumentation };

    static getInstance() {
        if (!JsonConfig._instance) {
            JsonConfig._instance = new JsonConfig();
        }
        return JsonConfig._instance;
    }

    constructor() {
        // Load env variables first
        this.connectionString = process.env[ENV_connectionString];
        this.disableAllExtendedMetrics = !!process.env[ENV_nativeMetricsDisableAll];
        this.extendedMetricDisablers = process.env[ENV_nativeMetricsDisablers];
        this.disableStatsbeat = !!process.env[ENV_noStatsbeat];
        this._loadJsonFile();
    }

    private _loadJsonFile() {
        let configFileName = "applicationinsights.json";
        let rootPath = path.join(__dirname, "../../../../"); // Root of applicationinsights folder (__dirname = ../out)
        let tempDir = path.join(rootPath, configFileName); // default
        let configFile = process.env[ENV_CONFIGURATION_FILE];
        if (configFile) {
            if (path.isAbsolute(configFile)) {
                tempDir = configFile;
            } else {
                tempDir = path.join(rootPath, configFile); // Relative path to applicationinsights folder
            }
        }
        try {
            const jsonConfig: IJsonConfig = JSON.parse(fs.readFileSync(tempDir, "utf8"));
            if (jsonConfig.disableStatsbeat != undefined) {
                this.disableStatsbeat = jsonConfig.disableStatsbeat;
            }
            if (jsonConfig.disableAllExtendedMetrics != undefined) {
                this.disableAllExtendedMetrics = jsonConfig.disableStatsbeat;
            }
            if (jsonConfig.connectionString != undefined) {
                this.connectionString = jsonConfig.connectionString;
            }
            if (jsonConfig.extendedMetricDisablers != undefined) {
                this.extendedMetricDisablers = jsonConfig.extendedMetricDisablers;
            }
            this.endpointUrl = jsonConfig.endpointUrl;
            this.samplingPercentage = jsonConfig.samplingPercentage;
            this.enableAutoCollectExternalLoggers = jsonConfig.enableAutoCollectExternalLoggers;
            this.enableAutoCollectConsole = jsonConfig.enableAutoCollectConsole;
            this.enableAutoCollectExceptions = jsonConfig.enableAutoCollectExceptions;
            this.enableAutoCollectPerformance = jsonConfig.enableAutoCollectPerformance;
            this.enableAutoCollectExtendedMetrics = jsonConfig.enableAutoCollectExtendedMetrics;
            this.enableAutoCollectPreAggregatedMetrics =
                jsonConfig.enableAutoCollectPreAggregatedMetrics;
            this.enableAutoCollectHeartbeat = jsonConfig.enableAutoCollectHeartbeat;
            this.enableAutoCollectRequests = jsonConfig.enableAutoCollectRequests;
            this.enableAutoCollectDependencies = jsonConfig.enableAutoCollectDependencies;
            this.enableSendLiveMetrics = jsonConfig.enableSendLiveMetrics;
            this.quickPulseHost = jsonConfig.quickPulseHost;
            this.instrumentations = jsonConfig.instrumentations;
        } catch (err) {
            Logger.getInstance().info("Missing or invalid JSON config file: ", err);
        }
    }
}
