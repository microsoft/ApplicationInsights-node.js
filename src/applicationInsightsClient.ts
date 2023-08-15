// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.


import { AzureMonitorOpenTelemetryClient } from "@azure/monitor-opentelemetry";
import { Logger } from "./shared/logging";
import { AutoCollectConsole } from "./logs/console";
import { AutoCollectExceptions, parseStack } from "./logs/exceptions";
import { ApplicationInsightsOptions, ExtendedMetricType } from "./types";
import { ApplicationInsightsConfig } from "./shared/configuration/config";
import { IConfig } from "./shim/types";
import { HttpInstrumentationConfig } from "@opentelemetry/instrumentation-http";



export class ApplicationInsightsClient {
    private _internalConfig: ApplicationInsightsConfig;
    private _client: AzureMonitorOpenTelemetryClient;
    private _console: AutoCollectConsole;
    private _exceptions: AutoCollectExceptions;
   

   

    /**
     * Constructs a new client
     * @param options ApplicationInsightsOptions
     */
    constructor(options?: ApplicationInsightsOptions) {

        this._internalConfig = new ApplicationInsightsConfig(options);
        this._client = new AzureMonitorOpenTelemetryClient(options);
        this._console = new AutoCollectConsole(this);
        if (this._internalConfig.enableAutoCollectExceptions) {
            this._exceptions = new AutoCollectExceptions(this);
        }
        
        this._console.enable(this._internalConfig.logInstrumentationOptions);


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
     * Shutdown client
     */
    public async shutdown(): Promise<void> {
        this._client.shutdown();
        this._console.shutdown();
        this._console = null;
        this._exceptions?.shutdown();
        this._exceptions = null;
    }


    
}
