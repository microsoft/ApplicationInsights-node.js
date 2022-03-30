import { Config } from "./Configuration/Config";
import { Context } from "./Context";
import * as  Contracts from "../Declarations/Contracts";
import { CorrelationContextManager } from "../AutoCollection/CorrelationContextManager";
import { Statsbeat } from "../AutoCollection/Statsbeat";
import { Util } from "./Util/Util";
import { Logger } from "./Logging/Logger";
import { FlushOptions } from "../Declarations/FlushOptions";
import { TelemetryItem as Envelope } from "../Declarations/Generated";
import { QuickPulseStateManager } from "./QuickPulse/QuickPulseStateManager";
import { LogHandler, MetricHandler, TraceHandler } from "./Handlers";

/**
 * Application Insights telemetry client provides interface to track telemetry items, register telemetry initializers and
 * and manually trigger immediate sending (flushing)
 */
export class TelemetryClient {
    private static TAG = "TelemetryClient";
    private _telemetryProcessors: { (envelope: Envelope, contextObjects: { [name: string]: any; }): boolean; }[] = [];
    private _statsbeat: Statsbeat;

    public traceHandler: TraceHandler;
    public metricHandler: MetricHandler;
    public logHandler: LogHandler;
    public config: Config;
    public context: Context;
    public commonProperties: { [key: string]: string; };
    public quickPulseClient: QuickPulseStateManager;

    /**
     * Constructs a new client of the client
     * @param setupString the Connection String or Instrumentation Key to use (read from environment variable if not specified)
     */
    constructor(setupString?: string) {
        var config = new Config(setupString);
        this.config = config;
        this.context = new Context();
        this.commonProperties = {};
        if (!this.config.disableStatsbeat) {
            this._statsbeat = new Statsbeat(this.config, this.context);
            this._statsbeat.enable(true);
        }
        this.traceHandler = new TraceHandler(this.config, this.context);
        this.metricHandler = new MetricHandler(this.config, this.context);
        this.logHandler = new LogHandler(this.config, this._statsbeat);
    }

    /**
     * Log information about availability of an application
     * @param telemetry      Object encapsulating tracking options
     */
    public trackAvailability(telemetry: Contracts.AvailabilityTelemetry): void {
        this.logHandler.trackAvailability(telemetry);
    }

    /**
     * Log a page view
     * @param telemetry      Object encapsulating tracking options
     */
    public trackPageView(telemetry: Contracts.PageViewTelemetry): void {
        this.logHandler.trackPageView(telemetry);
    }

    /**
     * Log a trace message
     * @param telemetry      Object encapsulating tracking options
     */
    public trackTrace(telemetry: Contracts.TraceTelemetry): void {
        this.logHandler.trackTrace(telemetry);
    }

    /**
     * Log a numeric value that is not associated with a specific event. Typically used to send regular reports of performance indicators.
     * To send a single measurement, use just the first two parameters. If you take measurements very frequently, you can reduce the
     * telemetry bandwidth by aggregating multiple measurements and sending the resulting average at intervals.
     * @param telemetry      Object encapsulating tracking options
     */
    public trackMetric(telemetry: Contracts.MetricTelemetry): void {
        this.metricHandler.trackMetric(telemetry);
    }

    /**
     * Log an exception
     * @param telemetry      Object encapsulating tracking options
     */
    public trackException(telemetry: Contracts.ExceptionTelemetry): void {
        this.logHandler.trackException(telemetry);
    }

    /**
     * Log a user action or other occurrence.
     * @param telemetry      Object encapsulating tracking options
     */
    public trackEvent(telemetry: Contracts.EventTelemetry): void {
        this.logHandler.trackEvent(telemetry);
    }

    /**
     * Log a request. Note that the default client will attempt to collect HTTP requests automatically so only use this for requests
     * that aren't automatically captured or if you've disabled automatic request collection.
     *
     * @param telemetry      Object encapsulating tracking options
     */
    public trackRequest(telemetry: Contracts.RequestTelemetry & Contracts.Identified): void {
        this.traceHandler.trackRequest(telemetry);
    }

    /**
     * Log a dependency. Note that the default client will attempt to collect dependencies automatically so only use this for dependencies
     * that aren't automatically captured or if you've disabled automatic dependency collection.
     *
     * @param telemetry      Object encapsulating tracking option
     * */
    public trackDependency(telemetry: Contracts.DependencyTelemetry & Contracts.Identified) {
        this.traceHandler.trackDependency(telemetry);
    }

    /**
     * Immediately send all queued telemetry.
     * @param options Flush options, including indicator whether app is crashing and callback
     */
    public flush(options?: FlushOptions) {
        this.traceHandler.flush(options);
        this.metricHandler.flush(options);
        this.logHandler.flush(options);
    }

    /**
     * Generic track method for all telemetry types
     * @param data the telemetry to send
     * @param telemetryType specify the type of telemetry you are tracking from the list of Contracts.DataTypes
     */
    public track(telemetry: Contracts.Telemetry, telemetryType: Contracts.TelemetryType) {
        // TODO: Convert to envelope
        //this.logHandler.track(telemetry);
    }

    /**
     * Automatically populate telemetry properties like RoleName when running in Azure
     *
      * @param value if true properties will be populated
      * TODO:// Check if possible to remove attributes from Resource
     */
    public setAutoPopulateAzureProperties() {
        //TODO: Use context to set these
        // if (process.env.WEBSITE_SITE_NAME) { // Azure Web apps and Functions
        //     this._resource.merge(new Resource({
        //         [SemanticResourceAttributes.SERVICE_NAME]: process.env.WEBSITE_SITE_NAME
        //     }));
        // }
        // if (process.env.WEBSITE_INSTANCE_ID) {
        //     this._resource.merge(new Resource({
        //         [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.WEBSITE_INSTANCE_ID
        //     }));
        // }

    }

    public setUseDiskRetryCaching(value: boolean, resendInterval?: number, maxBytesOnDisk?: number) {

    }

    /**
     * Adds telemetry processor to the collection. Telemetry processors will be called one by one
     * before telemetry item is pushed for sending and in the order they were added.
     *
     * @param telemetryProcessor function, takes Envelope, and optional context object and returns boolean
     */
    public addTelemetryProcessor(telemetryProcessor: (envelope: Envelope, contextObjects?: { [name: string]: any; }) => boolean) {
        this._telemetryProcessors.push(telemetryProcessor);
    }

    /*
     * Removes all telemetry processors
     */
    public clearTelemetryProcessors() {
        this._telemetryProcessors = [];
    }

    private runTelemetryProcessors(envelope: Envelope, contextObjects: { [name: string]: any; }): boolean {
        var accepted = true;
        var telemetryProcessorsCount = this._telemetryProcessors.length;
        if (telemetryProcessorsCount === 0) {
            return accepted;
        }
        contextObjects = contextObjects || {};
        contextObjects["correlationContext"] = CorrelationContextManager.getCurrentContext();
        for (var i = 0; i < telemetryProcessorsCount; ++i) {
            try {
                var processor = this._telemetryProcessors[i];
                if (processor) {
                    if (processor.apply(null, [envelope, contextObjects]) === false) {
                        accepted = false;
                        break;
                    }
                }

            } catch (error) {
                accepted = true;
                Logger.warn(TelemetryClient.TAG, "One of telemetry processors failed, telemetry item will be sent.", error, envelope);
            }
        }

        // Sanitize tags and properties after running telemetry processors
        if (accepted) {
            if (envelope && envelope.tags) {
                envelope.tags = Util.getInstance().validateStringMap(envelope.tags);
            }
            if (envelope && envelope.data && envelope.data.baseData && envelope.data.baseData.properties) {
                envelope.data.baseData.properties = Util.getInstance().validateStringMap(envelope.data.baseData.properties);
            }
        }

        return accepted;
    }

    /*
     * Get Statsbeat instance
     */
    public getStatsbeat() {
        return this._statsbeat;
    }
}
