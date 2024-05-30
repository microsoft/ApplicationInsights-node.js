// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureMonitorExporterOptions } from "@azure/monitor-opentelemetry-exporter";
import { diag } from "@opentelemetry/api";
import {
    Resource,
    ResourceDetectionConfig,
    detectResourcesSync,
    envDetectorSync,
} from "@opentelemetry/resources";
import { JsonConfig } from "./jsonConfig";
import { AzureMonitorOpenTelemetryOptions, OTLPExporterConfig, InstrumentationOptions } from "../../types";
import { logLevelParser } from "../util/logLevelParser";

const loggingLevel = "APPLICATIONINSIGHTS_INSTRUMENTATION_LOGGING_LEVEL";


export class ApplicationInsightsConfig {
    public enableAutoCollectExceptions: boolean;
    /** OTLP Trace Exporter Configuration */
    public otlpTraceExporterConfig: OTLPExporterConfig;
    /** OTLP Metric Exporter Configuration */
    public otlpMetricExporterConfig: OTLPExporterConfig;
    /** OTLP Log Exporter Configuration */
    public otlpLogExporterConfig: OTLPExporterConfig;

    /** The rate of telemetry items tracked that should be transmitted (Default 1.0) */
    public samplingRatio: number;
    /** Azure Monitor Exporter Configuration */
    public azureMonitorExporterOptions: AzureMonitorExporterOptions;
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

    constructor(options?: AzureMonitorOpenTelemetryOptions) {
        // Default values
        this.otlpLogExporterConfig = {};
        this.otlpMetricExporterConfig = {};
        this.otlpTraceExporterConfig = {};
        this.enableAutoCollectPerformance = true;
        this.enableAutoCollectExceptions = true;

        this.azureMonitorExporterOptions = {};
        this.samplingRatio = 1;
        this.instrumentationOptions = {
            http: { enabled: true },
            azureSdk: { enabled: false },
            mongoDb: { enabled: false },
            mySql: { enabled: false },
            postgreSql: { enabled: false },
            redis: { enabled: false },
            redis4: { enabled: false },
            console: { enabled: false },
            bunyan: { enabled: false },
            winston: { enabled: false },
        };
        this._resource = this._getDefaultResource();

        // Merge JSON configuration file if available
        // Check for explicitly passed options when instantiating client
        if (options) {
            if (typeof(options.enableAutoCollectExceptions) === "boolean") {
                this.enableAutoCollectExceptions = options.enableAutoCollectExceptions;
            }
            if (typeof(options.enableAutoCollectPerformance) === "boolean") {
                this.enableAutoCollectPerformance = options.enableAutoCollectPerformance;
            }
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
            this.azureMonitorExporterOptions = Object.assign(
                this.azureMonitorExporterOptions,
                options.azureMonitorExporterOptions
            );
            this.instrumentationOptions = Object.assign(
                this.instrumentationOptions,
                options.instrumentationOptions
            );
            this.resource = Object.assign(this.resource, options.resource);
            if (typeof(options.samplingRatio) === "number") {
                this.samplingRatio = options.samplingRatio;
            }

            // Set console logging level from env var
            if (process.env[loggingLevel]) { 
                this.instrumentationOptions = {
                    ...this.instrumentationOptions,
                    console: {
                        ...this.instrumentationOptions.console,
                        logSendingLevel: logLevelParser(process.env[loggingLevel]),
                    },
                }
            }

            this._mergeConfig();
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

            this.samplingRatio =
                jsonConfig.samplingRatio !== undefined ? jsonConfig.samplingRatio : this.samplingRatio;

            this.azureMonitorExporterOptions = Object.assign(
                this.azureMonitorExporterOptions,
                jsonConfig.azureMonitorExporterOptions
            );
            this.instrumentationOptions = Object.assign(
                this.instrumentationOptions,
                jsonConfig.instrumentationOptions
            );

        } catch (error) {
            diag.error("Failed to load JSON config file values.", error);
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
