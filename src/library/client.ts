import { Config } from "./configuration";
import { Statsbeat } from "../autoCollection/metrics/statsbeat";
import { Logger } from "./logging";
import { LogHandler, MetricHandler, TraceHandler } from "./handlers";


export class Client {
    private _config: Config;
    private _statsbeat: Statsbeat;
    private _traceHandler: TraceHandler;
    private _metricHandler: MetricHandler;
    private _logHandler: LogHandler;

    /**
     * Constructs a new client of the client
     * @param config Configuration
     */
    constructor(config?: Config) {
        this._config = config || new Config();
        if (!this._config.disableStatsbeat) {
            this._statsbeat = new Statsbeat(this._config);
            this._statsbeat.enable(true);
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

    public getConfig(): Config {
        return this._config;
    }

    public getStatsbeat(): Statsbeat {
        return this._statsbeat;
    }

    /**
     * Immediately send all queued telemetry.
     */
    public async flush(): Promise<void> {
        try {
            await this._traceHandler.flush();
            await this._metricHandler.flush();
            await this._logHandler.flush();
        }
        catch (err) {
            Logger.getInstance().error("Failed to flush telemetry", err);
        }
    }

    public async shutdown(): Promise<void> {
        this._traceHandler.shutdown();
        this._metricHandler.shutdown();
        this._logHandler.shutdown();
    }
}
