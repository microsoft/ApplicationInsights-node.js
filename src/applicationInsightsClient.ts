import { Resource } from "@opentelemetry/resources";
import { ApplicationInsightsConfig } from "./shared/configuration";
import { Statsbeat } from "./metrics/statsbeat";
import { Logger } from "./shared/logging";
import { LogHandler } from "./logs";
import { MetricHandler } from "./metrics";
import { TraceHandler } from "./traces";
import { ResourceManager } from "./shared";

export class ApplicationInsightsClient {
    private _config: ApplicationInsightsConfig;
    private _statsbeat: Statsbeat;
    private _traceHandler: TraceHandler;
    private _metricHandler: MetricHandler;
    private _logHandler: LogHandler;

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
