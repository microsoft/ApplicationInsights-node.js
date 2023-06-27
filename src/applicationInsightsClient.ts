// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Logger } from "./shared/logging";
import { AzureMonitorOpenTelemetryClient, AzureMonitorOpenTelemetryOptions } from "@azure/monitor-opentelemetry";


export class ApplicationInsightsClient {
    private _client: AzureMonitorOpenTelemetryClient;

    /**
     * Constructs a new client
     * @param options AzureMonitorOpenTelemetryOptions
     */
    constructor(options?: AzureMonitorOpenTelemetryOptions) {
        this._client = new AzureMonitorOpenTelemetryClient(options);
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
