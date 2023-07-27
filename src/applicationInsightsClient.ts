// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ApplicationInsightsConfig } from "./applicationInsightsConfig";
import { Logger } from "./shim/logging";
import { AzureMonitorOpenTelemetryClient, AzureMonitorOpenTelemetryOptions } from "@azure/monitor-opentelemetry";

/** 
* @deprecated Use TelemetryClient instead
*/
export class ApplicationInsightsClient {
    private _client: AzureMonitorOpenTelemetryClient;

    /**
     * Constructs a new client
     * @param options AzureMonitorOpenTelemetryOptions
     */
    constructor(options?: AzureMonitorOpenTelemetryOptions) {
        this._client = new AzureMonitorOpenTelemetryClient(options);
    }

    public start() {
        // No Op
    }

    public getTraceHandler(): any {
        return this._client["_traceHandler"];
    }

    public getMetricHandler(): any {
        return this._client["_metricHandler"];
    }

    public getLogHandler(): any {
        return this._client["_logHandler"];
    }

    /**
     * @deprecated This method should not be used
     */
    public getConfig(): ApplicationInsightsConfig {
        return null;
    }

    public getLogger(): Logger {
        return Logger.getInstance();
    }

    /**
   *Try to send all queued telemetry if present.
   */
    public async flush(): Promise<void> {
        try {
            await this._client.flush();
        } catch (err) {
            Logger.getInstance().error("Failed to flush telemetry", err);
        }
    }

    /**
  *Shutdown all handlers
  */
    public async shutdown(): Promise<void> {
        this._client.shutdown();
    }
}
