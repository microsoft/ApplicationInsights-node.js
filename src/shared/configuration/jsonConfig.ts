import * as fs from "fs";
import * as path from "path";
import { AzureMonitorExporterOptions } from "@azure/monitor-opentelemetry-exporter";
import { Logger } from "../logging";
import { IConfig, InstrumentationsConfig, LogInstrumentationsConfig, OTLPExporterConfig } from "./types";

const ENV_CONFIGURATION_FILE = "APPLICATIONINSIGHTS_CONFIGURATION_FILE";

export class JsonConfig implements IConfig {
    private static _instance: JsonConfig;
    public azureMonitorExporterConfig?: AzureMonitorExporterOptions;
    public otlpTraceExporterConfig?: OTLPExporterConfig;
    public otlpMetricExporterConfig?: OTLPExporterConfig;
    public samplingRatio: number;
    public enableAutoCollectExceptions: boolean;
    public enableAutoCollectPerformance: boolean;
    public enableAutoCollectStandardMetrics: boolean;
    public instrumentations: InstrumentationsConfig;
    public logInstrumentations: LogInstrumentationsConfig;
    public extendedMetrics: { [type: string]: boolean };

    /** Connection String used to send telemetry payloads to 
     * @deprecated This config should not be used, use azureMonitorExporterConfig to configure Connection String
    */
    public connectionString: string;
    /**
    * Disable offline storage when telemetry cannot be exported.
     * @deprecated This config should not be used, use azureMonitorExporterConfig to configure disableOfflineStorage
    */
    public disableOfflineStorage: boolean;
    /**
     * Directory to store retriable telemetry when it fails to export.
      * @deprecated This config should not be used, use azureMonitorExporterConfig to configure storageDirectory
     */
    public storageDirectory: string;

    public static getInstance() {
        if (!JsonConfig._instance) {
            JsonConfig._instance = new JsonConfig();
        }
        return JsonConfig._instance;
    }

    constructor() {
        this._loadJsonFile();
    }

    private _loadJsonFile() {
        const configFileName = "applicationinsights.json";
        const rootPath = path.join(__dirname, "../../../../"); // Root of applicationinsights folder (__dirname = ../out)
        let tempDir = path.join(rootPath, configFileName); // default
        const configFile = process.env[ENV_CONFIGURATION_FILE];
        if (configFile) {
            if (path.isAbsolute(configFile)) {
                tempDir = configFile;
            } else {
                tempDir = path.join(rootPath, configFile); // Relative path to applicationinsights folder
            }
        }
        try {
            const jsonConfig: IConfig = JSON.parse(fs.readFileSync(tempDir, "utf8"));
            this.azureMonitorExporterConfig = jsonConfig.azureMonitorExporterConfig;
            this.otlpMetricExporterConfig = jsonConfig.otlpMetricExporterConfig;
            this.otlpTraceExporterConfig = jsonConfig.otlpTraceExporterConfig;

            if (jsonConfig.connectionString !== undefined) {
                this.connectionString = jsonConfig.connectionString;
            }
            this.samplingRatio = jsonConfig.samplingRatio;
            this.enableAutoCollectExceptions = jsonConfig.enableAutoCollectExceptions;
            this.enableAutoCollectPerformance = jsonConfig.enableAutoCollectPerformance;
            this.enableAutoCollectStandardMetrics = jsonConfig.enableAutoCollectStandardMetrics;
            this.disableOfflineStorage = jsonConfig.disableOfflineStorage;
            this.storageDirectory = jsonConfig.storageDirectory;
            this.instrumentations = jsonConfig.instrumentations;
            this.logInstrumentations = jsonConfig.logInstrumentations;
            this.extendedMetrics = jsonConfig.extendedMetrics;
        } catch (err) {
            Logger.getInstance().info("Missing or invalid JSON config file: ", err);
        }
    }
}
