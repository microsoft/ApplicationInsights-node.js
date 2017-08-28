import url = require("url");
import os = require("os");

import Config = require("./Config");
import Context = require("./Context");
import Contracts = require("../Declarations/Contracts");
import Channel = require("./Channel");
import TelemetryProcessors = require("../TelemetryProcessors");
import { CorrelationContextManager } from "../AutoCollection/CorrelationContextManager";
import Sender = require("./Sender");
import Util = require("./Util");
import Logging = require("./Logging");
import Telemetry = require("./TelemetryTypes/Telemetry")
import DependencyTelemetry = require("./TelemetryTypes/DependencyTelemetry")
import EventTelemetry = require("./TelemetryTypes/EventTelemetry")
import TraceTelemetry = require("./TelemetryTypes/TraceTelemetry")
import ExceptionTelemetry = require("./TelemetryTypes/ExceptionTelemetry")
import RequestTelemetry = require("./TelemetryTypes/RequestTelemetry")
import MetricTelemetry = require("./TelemetryTypes/MetricTelemetry")
import EnvelopeFactory = require("./EnvelopeFactory")
import FlushOptions = require("./FlushOptions")
import TelemetryType = require("./TelemetryTypes/TelemetryType")

/**
 * Application Insights telemetry client provides interface to track telemetry items, register telemetry initializers and
 * and manually trigger immediate sending (flushing)
 */
class Client {
    private _telemetryProcessors: { (envelope: Contracts.Envelope, contextObjects: { [name: string]: any; }): boolean; }[] = [];

    public config: Config;
    public context: Context;
    public commonProperties: { [key: string]: string; };
    public channel: Channel;

    /**
     * Constructs a new client of the client
     * @param iKey the instrumentation key to use (read from environment variable if not specified)
     */
    constructor(iKey?: string) {
        var config = new Config(iKey);
        this.config = config;
        this.context = new Context();
        this.commonProperties = {};

        var sender = new Sender(this.config);
        this.channel = new Channel(() => config.disableAppInsights, () => config.maxBatchSize, () => config.maxBatchIntervalMs, sender);
    }

    /**
     * Log a trace message
     * @param telemetry      Object encapsulating tracking options
     */
    public trackTrace(telemetry: TraceTelemetry): void {
        this.track(telemetry, TelemetryType.Trace);
    }

    /**
     * Log a numeric value that is not associated with a specific event. Typically used to send regular reports of performance indicators.
     * To send a single measurement, use just the first two parameters. If you take measurements very frequently, you can reduce the
     * telemetry bandwidth by aggregating multiple measurements and sending the resulting average at intervals.
     * @param telemetry      Object encapsulating tracking options
     */
    public trackMetric(telemetry: MetricTelemetry): void {
        this.track(telemetry, TelemetryType.Metric);
    }

    /**
     * Log an exception
     * @param telemetry      Object encapsulating tracking options
     */
    public trackException(telemetry: ExceptionTelemetry): void {
        if (telemetry && telemetry.exception && !Util.isError(telemetry.exception)) {
            telemetry.exception = new Error(telemetry.exception.toString());
        }
        this.track(telemetry, TelemetryType.Exception);
    }

    /**
     * Log a user action or other occurrence.
     * @param telemetry      Object encapsulating tracking options
     */
    public trackEvent(telemetry: EventTelemetry): void {

        this.track(telemetry, TelemetryType.Event);
    }

    /**
     * Log a user action or other occurrence.
     * @param telemetry      Object encapsulating tracking options
     */
    public trackRequest(telemetry: RequestTelemetry): void {
        this.track(telemetry, TelemetryType.Request);
    }

    /**
     * Log a dependency. Note that the default client will attempt collect dependencies automatically so only use this for dependencies 
     * that aren't automatically captured or if you've disabled custom dependencies.
     * 
     * @param telemetry      Object encapsulating tracking option
     * */
    public trackDependency(telemetry: DependencyTelemetry) {

        if (telemetry && !telemetry.target && telemetry.data) {
            telemetry.target = url.parse(telemetry.data).host;
        }
        this.track(telemetry, TelemetryType.Dependency);
    }

    /**
     * Immediately send all queued telemetry.
     * @param options Flush options, including indicator whether app is crashing and callback
     */
    public flush(options?: FlushOptions) {
        this.channel.triggerSend(
            options ? !!options.isAppCrashing : false,
            options ? options.callback : undefined);
    }

    /**
     * Generic track method for all telemetry types
     * @param data the telemetry to send
     * @param telemetryType specify the type of telemetry you are tracking from the list of Contracts.DataTypes
     */
    public track(telemetry: Telemetry, telemetryType: TelemetryType) {
        if (telemetry && telemetryType) {
            var envelope = EnvelopeFactory.createEnvelope(telemetry, telemetryType, this.commonProperties, this.context, this.config);

            // Set time on the envelope if it was set on the telemetry item
            if (telemetry.time) {
                envelope.time = telemetry.time.toISOString();
            }

            var accepted = this.runTelemetryProcessors(envelope, telemetry.contextObjects);

            // Ideally we would have a central place for "internal" telemetry processors and users can configure which ones are in use.
            // This will do for now. Otherwise clearTelemetryProcessors() would be problematic.
            var sampledIn = TelemetryProcessors.samplingTelemetryProcessor(envelope, { correlationContext: CorrelationContextManager.getCurrentContext() });

            if (accepted && sampledIn) {
                this.channel.send(envelope);
            }
        }
        else {
            Logging.warn("track() requires telemetry object and telemetryType to be specified.")
        }
    }

    /**
     * Adds telemetry processor to the collection. Telemetry processors will be called one by one
     * before telemetry item is pushed for sending and in the order they were added.
     *
     * @param telemetryProcessor function, takes Envelope, and optional context object and returns boolean
     */
    public addTelemetryProcessor(telemetryProcessor: (envelope: Contracts.Envelope, contextObjects?: { [name: string]: any; }) => boolean) {
        this._telemetryProcessors.push(telemetryProcessor);
    }

    /*
     * Removes all telemetry processors
     */
    public clearTelemetryProcessors() {
        this._telemetryProcessors = [];
    }

    private runTelemetryProcessors(envelope: Contracts.Envelope, contextObjects: { [name: string]: any; }): boolean {
        var accepted = true;
        var telemetryProcessorsCount = this._telemetryProcessors.length;

        if (telemetryProcessorsCount === 0) {
            return accepted;
        }

        contextObjects = contextObjects || {};
        contextObjects['correlationContext'] = CorrelationContextManager.getCurrentContext();

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
                Logging.warn("One of telemetry processors failed, telemetry item will be sent.", error, envelope);
            }
        }

        return accepted;
    }
}

export = Client;
