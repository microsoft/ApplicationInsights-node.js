import * as fs from "fs";
import * as path from "path";
import { Logger } from "../logging";
import { IBaseConfig, IConfig, InstrumentationsConfig, LogInstrumentationsConfig } from "./types";

const ENV_CONFIGURATION_FILE = "APPLICATIONINSIGHTS_CONFIGURATION_FILE";

export class JsonConfig implements IBaseConfig {
    private static _instance: JsonConfig;

    public connectionString: string;
    public samplingRate: number;
    public enableAutoCollectExceptions: boolean;
    public enableAutoCollectPerformance: boolean;
    public enableAutoCollectStandardMetrics: boolean;
    public enableAutoCollectHeartbeat: boolean;
    public disableOfflineStorage: boolean;
    public storageDirectory: string;
    public instrumentations: InstrumentationsConfig;
    public logInstrumentations: LogInstrumentationsConfig;
    public extendedMetrics: { [type: string]: boolean };

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
            if (jsonConfig.connectionString !== undefined) {
                this.connectionString = jsonConfig.connectionString;
            }
            this.samplingRate = jsonConfig.samplingRate;
            this.enableAutoCollectExceptions = jsonConfig.enableAutoCollectExceptions;
            this.enableAutoCollectPerformance = jsonConfig.enableAutoCollectPerformance;
            this.enableAutoCollectStandardMetrics = jsonConfig.enableAutoCollectStandardMetrics;
            this.enableAutoCollectHeartbeat = jsonConfig.enableAutoCollectHeartbeat;
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
