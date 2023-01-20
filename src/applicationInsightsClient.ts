import { Resource } from "@opentelemetry/resources";
import { ApplicationInsightsConfig } from "./shared/configuration";
import { Statsbeat } from "./metrics/statsbeat";
import { Logger } from "./shared/logging";
import { LogHandler } from "./logs";
import { MetricHandler } from "./metrics";
import { TraceHandler } from "./traces";
import { ResourceManager } from "./shared";
import { StatsbeatFeature, StatsbeatInstrumentation } from "./metrics/statsbeat/types";

export class ApplicationInsightsClient {
    private _config: ApplicationInsightsConfig;
    private _statsbeat: Statsbeat;
    private _traceHandler: TraceHandler;
    private _metricHandler: MetricHandler;
    private _logHandler: LogHandler;

    private _instrumentation: StatsbeatInstrumentation;
    private _feature: StatsbeatFeature;

    /**
     * Constructs a new client of the client
     * @param config Configuration
     */
    constructor(config?: ApplicationInsightsConfig) {
        this._config = config || new ApplicationInsightsConfig();
        if (!this._config.connectionString || this._config.connectionString === "") {
            throw new Error(
                "Connection String not found, please provide it before starting Application Insights SDK."
            );
        }
        this._getStatsbeatInstrumentations();
        this._getStatsbeatFeatures();
        process.env.AZURE_MONITOR_STATSBEAT_FEATURES = JSON.stringify({
            instrumentation: this._instrumentation,
            feature: this._feature
        });

        // Statsbeat enable/disable is handled from within the Statsbeat class
        this._statsbeat = new Statsbeat(this._config);
        this._metricHandler = new MetricHandler(this._config);
        this._traceHandler = new TraceHandler(this._config, this._metricHandler);
        this._logHandler = new LogHandler(this._config, this._metricHandler);
    }

    public start() {
        this._traceHandler.start();
        this._metricHandler.start();
        this._logHandler.start();
    }

    public getTraceHandler(): TraceHandler {
        return this._traceHandler;
    }

    public getMetricHandler(): MetricHandler {
        return this._metricHandler;
    }

    public getLogHandler(): LogHandler {
        return this._logHandler;
    }

    public getConfig(): ApplicationInsightsConfig {
        return this._config;
    }

    public getStatsbeat(): Statsbeat {
        return this._statsbeat;
    }

    public getTraceResource(): Resource {
        return ResourceManager.getInstance().getTraceResource();
    }

    public getMetricResource(): Resource {
        return ResourceManager.getInstance().getMetricResource();
    }

    public getLogResource(): Resource {
        return ResourceManager.getInstance().getLogResource();
    }

    public getLogger(): Logger {
        return Logger.getInstance();
    }

    private _getStatsbeatInstrumentations() {
        if (this._config?.instrumentations?.azureSdk?.enabled) {
            this._addInstrumentation(StatsbeatInstrumentation.AZURE_CORE_TRACING);
        }
        if (this._config?.instrumentations?.mongoDb?.enabled) {
            this._addInstrumentation(StatsbeatInstrumentation.MONGODB);
        }
        if (this._config?.instrumentations?.mySql?.enabled) {
            this._addInstrumentation(StatsbeatInstrumentation.MYSQL);
        }
        if (this._config?.instrumentations?.postgreSql?.enabled) {
            this._addInstrumentation(StatsbeatInstrumentation.POSTGRES);
        }
        if (this._config?.instrumentations?.redis?.enabled) {
            this._addInstrumentation(StatsbeatInstrumentation.REDIS);
        }
    }

    private _getStatsbeatFeatures() {
        if (this._config?.aadTokenCredential) {
            this._addFeature(StatsbeatFeature.AAD_HANDLING);
        }
        if (!this._config?.disableOfflineStorage) {
            this._addFeature(StatsbeatFeature.DISK_RETRY);
        }
    }

    private _addFeature(feature: number) {
        this._feature |= feature;
    }
    
    private _addInstrumentation(instrumentation: number) {
        this._instrumentation |= instrumentation;
    }

    /**
     * Immediately send all queued telemetry.
     */
    public async flush(): Promise<void> {
        try {
            await this._traceHandler.flush();
            await this._metricHandler.flush();
            await this._logHandler.flush();
        } catch (err) {
            Logger.getInstance().error("Failed to flush telemetry", err);
        }
    }

    public async shutdown(): Promise<void> {
        this._traceHandler.shutdown();
        this._metricHandler.shutdown();
        this._logHandler.shutdown();
    }
}
