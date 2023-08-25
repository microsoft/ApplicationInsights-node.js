// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { shutdownAzureMonitor, useAzureMonitor } from "@azure/monitor-opentelemetry";
import { metrics, trace } from "@opentelemetry/api";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { logs } from "@opentelemetry/api-logs";
import { LoggerProvider } from "@opentelemetry/sdk-logs";
import { BasicTracerProvider } from "@opentelemetry/sdk-trace-node";
import { Logger } from "./shared/logging";
import { AutoCollectConsole } from "./logs/console";
import { AutoCollectExceptions } from "./logs/exceptions";
import { ApplicationInsightsOptions } from "./types";
import { ApplicationInsightsConfig } from "./shared/configuration/config";
import { LogApi } from "./logs/api";


export class ApplicationInsightsClient {
    private _internalConfig: ApplicationInsightsConfig;
    private _console: AutoCollectConsole;
    private _exceptions: AutoCollectExceptions;
    private _logApi: LogApi;

    /**
     * Constructs a new client
     * @param options ApplicationInsightsOptions
     */
    constructor(options?: ApplicationInsightsOptions) {
        useAzureMonitor(options);
        this._internalConfig = new ApplicationInsightsConfig(options);
        this._console = new AutoCollectConsole(this._logApi);
        this._logApi = new LogApi(logs.getLogger("ApplicationInsightsLogger"));
        if (this._internalConfig.enableAutoCollectExceptions) {
            this._exceptions = new AutoCollectExceptions(this._logApi);
        }
        this._console.enable(this._internalConfig.logInstrumentationOptions);
    }

    /**
   *Try to send all queued telemetry if present.
   */
    public async flush(): Promise<void> {
        try {
            await (metrics.getMeterProvider() as MeterProvider).forceFlush();
            await (trace.getTracerProvider() as BasicTracerProvider).forceFlush();
            await (logs.getLoggerProvider() as LoggerProvider).forceFlush();
        } catch (err) {
            Logger.getInstance().error("Failed to flush telemetry", err);
        }
    }

    /**
     * Shutdown client
     */
    public async shutdown(): Promise<void> {
        shutdownAzureMonitor();
        this._console.shutdown();
        this._console = null;
        this._exceptions?.shutdown();
        this._exceptions = null;
    }
}
