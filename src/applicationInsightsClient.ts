// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ApplicationInsightsConfig } from "./shared/configuration";
import { Logger } from "./shared/logging";
import { LogHandler } from "./logs";
import { MetricHandler } from "./metrics";
import { TraceHandler } from "./traces";
import { AZURE_MONITOR_STATSBEAT_FEATURES, StatsbeatFeature, StatsbeatInstrumentation } from "./types";


export class ApplicationInsightsClient {
    private _config: ApplicationInsightsConfig;
    private _traceHandler: TraceHandler;
    private _metricHandler: MetricHandler;
    private _logHandler: LogHandler;

    /**
     * Constructs a new client of the client
     * @param config Configuration
     */
    constructor(config?: ApplicationInsightsConfig) {
        this._config = config || new ApplicationInsightsConfig();
        if (!this._config.azureMonitorExporterConfig.connectionString || this._config.azureMonitorExporterConfig.connectionString === "") {
            throw new Error(
                "Connection String not found, please provide it before starting Application Insights SDK."
            );
        }
        this._setStatsbeatFeatures();
        this._metricHandler = new MetricHandler(this._config);
        this._traceHandler = new TraceHandler(this._config, this._metricHandler);
        this._logHandler = new LogHandler(this._config, this._metricHandler);
    }

    /** 
* @deprecated This should not be used
*/
    public start() {
        // No Op
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

    public getLogger(): Logger {
        return Logger.getInstance();
    }

    /**
   *Try to send all queued telemetry if present.
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

    /**
  *Shutdown all handlers
  */
    public async shutdown(): Promise<void> {
        this._traceHandler.shutdown();
        this._metricHandler.shutdown();
        this._logHandler.shutdown();
    }

    private _setStatsbeatFeatures() {
        let instrumentationBitMap = 0;
        if (this._config.instrumentations?.azureSdk?.enabled) {
            instrumentationBitMap |= StatsbeatInstrumentation.AZURE_CORE_TRACING;
        }
        if (this._config.instrumentations?.mongoDb?.enabled) {
            instrumentationBitMap |= StatsbeatInstrumentation.MONGODB;
        }
        if (this._config.instrumentations?.mySql?.enabled) {
            instrumentationBitMap |= StatsbeatInstrumentation.MYSQL;
        }
        if (this._config.instrumentations?.postgreSql?.enabled) {
            instrumentationBitMap |= StatsbeatInstrumentation.POSTGRES;
        }
        if (this._config.instrumentations?.redis?.enabled) {
            instrumentationBitMap |= StatsbeatInstrumentation.REDIS;
        }
        if (this._config.logInstrumentations?.bunyan?.enabled) {
            instrumentationBitMap |= StatsbeatInstrumentation.BUNYAN;
        }
        if (this._config.logInstrumentations?.winston?.enabled) {
            instrumentationBitMap |= StatsbeatInstrumentation.WINSTON;
        }
        if (this._config.logInstrumentations?.console?.enabled) {
            instrumentationBitMap |= StatsbeatInstrumentation.CONSOLE;
        }

        let featureBitMap = 0;
        featureBitMap |= StatsbeatFeature.DISTRO;


        try {
            process.env[AZURE_MONITOR_STATSBEAT_FEATURES] = JSON.stringify({
                instrumentation: instrumentationBitMap,
                feature: featureBitMap
            });
        } catch (error) {
            Logger.getInstance().error("Failed call to JSON.stringify.", error);
        }
    }
}
