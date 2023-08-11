import * as fs from "fs";
import * as path from "path";
import { Logger } from "../logging";
import { ApplicationInsightsOptions, LogInstrumentationsConfig } from "../../types";

const ENV_CONFIGURATION_FILE = "APPLICATIONINSIGHTS_CONFIGURATION_FILE";
const ENV_CONTENT = "APPLICATIONINSIGHTS_CONFIGURATION_CONTENT";
const ENV_connectionString = "APPLICATIONINSIGHTS_CONNECTION_STRING";
const ENV_azurePrefix = "APPSETTING_"; // Azure adds this prefix to all environment variables
const ENV_instrumentationKey = "APPINSIGHTS_INSTRUMENTATIONKEY";
const ENV_legacyInstrumentationKey = "APPINSIGHTS_INSTRUMENTATION_KEY"
const ENV_nativeMetricsDisablers = "APPLICATION_INSIGHTS_DISABLE_EXTENDED_METRIC";
const ENV_nativeMetricsDisableAll = "APPLICATION_INSIGHTS_DISABLE_ALL_EXTENDED_METRICS";
const ENV_http_proxy = "http_proxy";
const ENV_https_proxy = "https_proxy";
const ENV_noDiagnosticChannel = "APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL";
const ENV_noStatsbeat = "APPLICATION_INSIGHTS_NO_STATSBEAT";
const ENV_noHttpAgentKeepAlive = "APPLICATION_INSIGHTS_NO_HTTP_AGENT_KEEP_ALIVE";
const ENV_noPatchModules = "APPLICATION_INSIGHTS_NO_PATCH_MODULES";

export class JsonConfig implements ApplicationInsightsOptions {
    private static _instance: JsonConfig;
    public enableAutoCollectExceptions: boolean;
    public connectionString: string;
    public instrumentationKey: string;
    public logInstrumentations: LogInstrumentationsConfig;
    public extendedMetrics: { [type: string]: boolean };
    public disableAllExtendedMetrics: boolean;
    public extendedMetricDisablers: string;
    public proxyHttpUrl: string;
    public proxyHttpsUrl: string;
    public noDiagnosticChannel: boolean;
    public disableStatsbeat: boolean;
    public noHttpAgentKeepAlive: boolean;
    public noPatchModules: string;

    public static getInstance() {
        if (!JsonConfig._instance) {
            JsonConfig._instance = new JsonConfig();
        }
        return JsonConfig._instance;
    }

    constructor() {
        // Load env variables first
        this.connectionString = process.env[ENV_connectionString];
        this.instrumentationKey = process.env[ENV_instrumentationKey]
            || process.env[ENV_azurePrefix + ENV_instrumentationKey]
            || process.env[ENV_legacyInstrumentationKey]
            || process.env[ENV_azurePrefix + ENV_legacyInstrumentationKey];
        this._loadJsonFile();
        if (!this.connectionString && this.instrumentationKey) {
            Logger.getInstance().warn("APPINSIGHTS_INSTRUMENTATIONKEY is in path of deprecation, please use APPLICATIONINSIGHTS_CONNECTION_STRING env variable to setup the SDK.");
        }
        this.disableAllExtendedMetrics = !!process.env[ENV_nativeMetricsDisableAll];
        this.extendedMetricDisablers = process.env[ENV_nativeMetricsDisablers];
        this.proxyHttpUrl = process.env[ENV_http_proxy];
        this.proxyHttpsUrl = process.env[ENV_https_proxy];
        this.noDiagnosticChannel = !!process.env[ENV_noDiagnosticChannel];
        this.disableStatsbeat = !!process.env[ENV_noStatsbeat];
        this.noHttpAgentKeepAlive = !!process.env[ENV_noHttpAgentKeepAlive];
        this.noPatchModules = process.env[ENV_noPatchModules] || "";
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
