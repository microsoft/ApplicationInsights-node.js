// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TokenCredential } from "@azure/core-auth";
import { Resource } from "@opentelemetry/resources";
import { ApplicationInsightsOptions, LogInstrumentationsConfig, OTLPExporterConfig } from "./types";
import { AzureMonitorExporterOptions } from "@azure/monitor-opentelemetry-exporter";
import { InstrumentationOptions } from "@azure/monitor-opentelemetry";

/** 
* @deprecated Use ApplicationInsightsOptions instead
*/
export class ApplicationInsightsConfig implements ApplicationInsightsOptions {
    // ApplicationInsightsOptions
    public otlpTraceExporterConfig?: OTLPExporterConfig;
    public otlpMetricExporterConfig?: OTLPExporterConfig;
    public  enableAutoCollectExceptions?: boolean;
    public extendedMetrics: { [type: string]: boolean };
    public logInstrumentations?: LogInstrumentationsConfig;
    // AzureMonitorOpenTelemetryOptions
    public azureMonitorExporterConfig?: AzureMonitorExporterOptions;
    public resource?: Resource;
    public samplingRatio: number;
    public enableAutoCollectPerformance: boolean;
    public enableAutoCollectStandardMetrics: boolean;
    public instrumentationOptions?: InstrumentationOptions;

    // Deprecated
    public enableAutoCollectHeartbeat: boolean;
    
    /** Connection String used to send telemetry payloads to
     * @deprecated This config should not be used, use azureMonitorExporterConfig to configure Connection String
     */
    public set connectionString(connectionString: string) {
        this.azureMonitorExporterConfig.connectionString = connectionString;
    }
    public get connectionString(): string {
        return this.azureMonitorExporterConfig.connectionString;
    }
    /** AAD TokenCredential to use to authenticate the app
     * @deprecated This config should not be used, use azureMonitorExporterConfig to configure aadTokenCredential
     */
    public set aadTokenCredential(aadTokenCredential: TokenCredential) {
        this.azureMonitorExporterConfig.aadTokenCredential = aadTokenCredential;
    }
    public get aadTokenCredential() {
        return this.azureMonitorExporterConfig.aadTokenCredential;
    }
    /**
     * Disable offline storage when telemetry cannot be exported.
     * @deprecated This config should not be used, use azureMonitorExporterConfig to configure disableOfflineStorage
     */
    public set disableOfflineStorage(disableOfflineStorage: boolean) {
        this.azureMonitorExporterConfig.disableOfflineStorage = disableOfflineStorage;
    }
    public get disableOfflineStorage() {
        return this.azureMonitorExporterConfig.disableOfflineStorage;
    }
    /**
     * Directory to store retriable telemetry when it fails to export.
     * @deprecated This config should not be used, use azureMonitorExporterConfig to configure storageDirectory
     */
    public set storageDirectory(storageDirectory: string) {
        this.azureMonitorExporterConfig.storageDirectory = storageDirectory;
    }
    public get storageDirectory() {
        return this.azureMonitorExporterConfig.storageDirectory;
    }
    /** 
     * @deprecated This config should not be used, use instrumentationOptions
     */
    public set instrumentations(instrumentations: InstrumentationOptions) {
        this.instrumentationOptions = instrumentations;
    }
    public get instrumentations(): InstrumentationOptions {
        return this.instrumentationOptions;
    }

    /**
     * Get Instrumentation Key
     * @deprecated This method should not be used
     */
    public getInstrumentationKey(): string {
        return "";
    }

    /**
     * Get Instrumentation Key
     * @deprecated This method should not be used
     */
    public getIngestionEndpoint(): string {
        return "";
    }

    /**
     * Get Instrumentation Key
     * @deprecated This method should not be used
     */
    public getDisableStatsbeat(): boolean {
        return false;
    }
}
