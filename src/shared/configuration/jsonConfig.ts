import * as fs from "fs";
import * as path from "path";
import { Logger } from "../logging";
import { ApplicationInsightsOptions, LogInstrumentationsConfig } from "../../types";

const ENV_CONFIGURATION_FILE = "APPLICATIONINSIGHTS_CONFIGURATION_FILE";
const ENV_CONTENT = "APPLICATIONINSIGHTS_CONFIGURATION_CONTENT";

export class JsonConfig implements ApplicationInsightsOptions {
    private static _instance: JsonConfig;
    public enableAutoCollectExceptions: boolean;
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
        let jsonString = "";
        const contentJsonConfig = process.env[ENV_CONTENT];
        // JSON string added directly in env variable
        if (contentJsonConfig) {
            jsonString = contentJsonConfig;
        }
        // JSON file
        else {
            const configFileName = "applicationinsights.json";
            const rootPath = path.join(__dirname, "../../../"); // Root of folder (__dirname = ../dist-esm/src)
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
                jsonString = fs.readFileSync(tempDir, "utf8");
            } catch (err) {
                Logger.getInstance().info("Failed to read JSON config file: ", err);
            }
        }
        try {
            const jsonConfig: ApplicationInsightsOptions = JSON.parse(jsonString);
            this.enableAutoCollectExceptions = jsonConfig.enableAutoCollectExceptions;
            this.logInstrumentations = jsonConfig.logInstrumentations;
            this.extendedMetrics = jsonConfig.extendedMetrics;
        } catch (err) {
            Logger.getInstance().info("Missing or invalid JSON config file: ", err);
        }
    }
}