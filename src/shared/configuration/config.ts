// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { InstrumentationOptions } from "@azure/monitor-opentelemetry";
import { AzureMonitorExporterOptions } from "@azure/monitor-opentelemetry-exporter";
import {
    Resource,
    ResourceDetectionConfig,
    detectResourcesSync,
    envDetectorSync,
} from "@opentelemetry/resources";
import { JsonConfig } from "./jsonConfig";
import { Logger } from "../logging";
import { ApplicationInsightsOptions, ExtendedMetricType, LogInstrumentationOptions, OTLPExporterConfig } from "../../types";



export class ApplicationInsightsConfig {
    public logInstrumentationOptions: LogInstrumentationOptions;
    public enableAutoCollectExceptions: boolean;
    public extendedMetrics: { [type: string]: boolean };
    /** OTLP Trace Exporter Configuration */
    public otlpTraceExporterConfig: OTLPExporterConfig;
    /** OTLP Metric Exporter Configuration */
    public otlpMetricExporterConfig: OTLPExporterConfig;
    /** OTLP Log Exporter Configuration */
    public otlpLogExporterConfig: OTLPExporterConfig;

    /** The rate of telemetry items tracked that should be transmitted (Default 1.0) */
    public samplingRatio: number;
    /** Azure Monitor Exporter Configuration */
    public azureMonitorExporterConfig: AzureMonitorExporterOptions;
    /**
     * OpenTelemetry Instrumentations configuration included as part of Azure Monitor (azureSdk, http, mongoDb, mySql, postgreSql, redis, redis4)
     */
    public instrumentationOptions: InstrumentationOptions;

    private _resource: Resource;

    public set resource(resource: Resource) {
        this._resource = this._resource.merge(resource);
    }

    /**
     *Get OpenTelemetry Resource
     */
    public get resource(): Resource {
        return this._resource;
    }

    /**
     * Sets the state of performance tracking (enabled by default)
     * if true performance counters will be collected every second and sent to Azure Monitor
     */
    public enableAutoCollectPerformance: boolean;

    constructor(options?: ApplicationInsightsOptions) {
        // Default values
        this.otlpLogExporterConfig = {};
        this.otlpMetricExporterConfig = {};
        this.otlpTraceExporterConfig = {};
        this.enableAutoCollectPerformance = true;
        this.logInstrumentationOptions = {
            console: { enabled: false },
            bunyan: { enabled: false },
            winston: { enabled: false },
        };
        this.extendedMetrics = {};
        this.extendedMetrics[ExtendedMetricType.gc] = false;
        this.extendedMetrics[ExtendedMetricType.heap] = false;
        this.extendedMetrics[ExtendedMetricType.loop] = false;
        this.enableAutoCollectExceptions = true;
        this.enableAutoCollectPerformance = true;

        this.azureMonitorExporterConfig = {};
        this.samplingRatio = 1;
        this.instrumentationOptions = {
            http: { enabled: true },
            azureSdk: { enabled: false },
            mongoDb: { enabled: false },
            mySql: { enabled: false },
            postgreSql: { enabled: false },
            redis: { enabled: false },
            redis4: { enabled: false },
        };
        this._resource = this._getDefaultResource();

        // Merge JSON configuration file if available
        this._mergeConfig();
        // Check for explicitly passed options when instantiating client
        // This will take precedence over other settings
        if (options) {
            this.enableAutoCollectExceptions =
                options.enableAutoCollectExceptions || this.enableAutoCollectExceptions;
            this.enableAutoCollectPerformance =
                options.enableAutoCollectPerformance || this.enableAutoCollectPerformance;
            this.logInstrumentationOptions = Object.assign(
                this.logInstrumentationOptions,
                options.logInstrumentationOptions
            );
            this.otlpTraceExporterConfig = Object.assign(
                this.otlpTraceExporterConfig,
                options.otlpTraceExporterConfig
            );
            this.otlpMetricExporterConfig = Object.assign(
                this.otlpMetricExporterConfig,
                options.otlpMetricExporterConfig
            );
            this.otlpLogExporterConfig = Object.assign(
                this.otlpLogExporterConfig,
                options.otlpLogExporterConfig
            );

            // Merge default with provided options
            this.azureMonitorExporterConfig = Object.assign(
                this.azureMonitorExporterConfig,
                options.azureMonitorExporterConfig
            );
            this.instrumentationOptions = Object.assign(
                this.instrumentationOptions,
                options.instrumentationOptions
            );
            this.resource = Object.assign(this.resource, options.resource);
            this.samplingRatio = options.samplingRatio || this.samplingRatio;
        }
    }

    private _mergeConfig() {
        try {
            const jsonConfig = JsonConfig.getInstance();
            this.enableAutoCollectPerformance =
                jsonConfig.enableAutoCollectPerformance !== undefined
                    ? jsonConfig.enableAutoCollectPerformance
                    : this.enableAutoCollectPerformance;
            this.enableAutoCollectExceptions =
                jsonConfig.enableAutoCollectExceptions !== undefined
                    ? jsonConfig.enableAutoCollectExceptions
                    : this.enableAutoCollectExceptions;


            this.otlpTraceExporterConfig = Object.assign(
                this.otlpTraceExporterConfig,
                jsonConfig.otlpTraceExporterConfig
            );
            this.otlpMetricExporterConfig = Object.assign(
                this.otlpMetricExporterConfig,
                jsonConfig.otlpMetricExporterConfig
            );
            this.otlpLogExporterConfig = Object.assign(
                this.otlpLogExporterConfig,
                jsonConfig.otlpLogExporterConfig
            );

            this.logInstrumentationOptions = Object.assign(
                this.logInstrumentationOptions,
                jsonConfig.logInstrumentationOptions
            );

            this.extendedMetrics = Object.assign(
                this.extendedMetrics,
                jsonConfig.extendedMetrics
            );

            this.samplingRatio =
                jsonConfig.samplingRatio !== undefined ? jsonConfig.samplingRatio : this.samplingRatio;

            this.azureMonitorExporterConfig = Object.assign(
                this.azureMonitorExporterConfig,
                jsonConfig.azureMonitorExporterConfig
            );
            this.instrumentationOptions = Object.assign(
                this.instrumentationOptions,
                jsonConfig.instrumentationOptions
            );

        } catch (error) {
            Logger.getInstance().error("Failed to load JSON config file values.", error);
        }
    }

    private _getDefaultResource(): Resource {
        let resource = Resource.default();
        // Load resource attributes from env
        const detectResourceConfig: ResourceDetectionConfig = {
            detectors: [envDetectorSync],
        };
        const envResource = detectResourcesSync(detectResourceConfig);
        resource = resource.merge(envResource);
        return resource;
    }
}
