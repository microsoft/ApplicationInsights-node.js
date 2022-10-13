import { InstrumentationConfig } from "@opentelemetry/instrumentation";
import * as fs from "fs";
import * as path from "path";
import { Logger } from "../logging";
import { iInstrumentation, IJsonConfig } from "./interfaces";


const ENV_CONFIGURATION_FILE = "APPLICATIONINSIGHTS_CONFIGURATION_FILE";
// Azure Connection String
const ENV_connectionString = "APPLICATIONINSIGHTS_CONNECTION_STRING";
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
    public enableAutoCollectPreAggregatedMetrics: boolean;
    public enableAutoCollectHeartbeat: boolean;
    public enableSendLiveMetrics: boolean;
    public disableStatsbeat: boolean;
    public quickPulseHost: string;
    public instrumentations: InstrumentationsConfig;
    public extendedMetrics: { [type: string]: boolean };


    static getInstance() {
        if (!JsonConfig._instance) {
            JsonConfig._instance = new JsonConfig();
        }
        return JsonConfig._instance;
    }

    constructor() {
        // Load env variables first
        this.connectionString = process.env[ENV_connectionString];
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
            if (jsonConfig.connectionString != undefined) {
                this.connectionString = jsonConfig.connectionString;
            }
            this.endpointUrl = jsonConfig.endpointUrl;
            this.samplingPercentage = jsonConfig.samplingPercentage;
            this.enableAutoCollectExternalLoggers = jsonConfig.enableAutoCollectExternalLoggers;
            this.enableAutoCollectConsole = jsonConfig.enableAutoCollectConsole;
            this.enableAutoCollectExceptions = jsonConfig.enableAutoCollectExceptions;
            this.enableAutoCollectPerformance = jsonConfig.enableAutoCollectPerformance;
            this.enableAutoCollectPreAggregatedMetrics =
                jsonConfig.enableAutoCollectPreAggregatedMetrics;
            this.enableAutoCollectHeartbeat = jsonConfig.enableAutoCollectHeartbeat;
            this.enableSendLiveMetrics = jsonConfig.enableSendLiveMetrics;
            this.quickPulseHost = jsonConfig.quickPulseHost;
            this.instrumentations = jsonConfig.instrumentations;
            this.extendedMetrics = jsonConfig.extendedMetrics;
        } catch (err) {
            Logger.getInstance().info("Missing or invalid JSON config file: ", err);
        }
    }
}
