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
    /**
     * Sets the state of performance tracking (enabled by default)
     * if true performance counters will be collected every second and sent to Azure Monitor
     */
    public enableAutoCollectPerformance: boolean;

    constructor(options?: ApplicationInsightsOptions) {
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

        } catch (error) {
            Logger.getInstance().error("Failed to load JSON config file values.", error);
        }
    }
}
