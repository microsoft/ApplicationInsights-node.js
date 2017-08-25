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
import Telemetry = require("./Telemetry")
import DependencyTelemetry = require("./DependencyTelemetry")
import EventTelemetry = require("./EventTelemetry")
import TraceTelemetry = require("./TraceTelemetry")
import ExceptionTelemetry = require("./ExceptionTelemetry")
import RequestTelemetry = require("./RequestTelemetry")
import MetricTelemetry = require("./MetricTelemetry")
import EnvelopeFactory = require("./EnvelopeFactory")

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

        var sender = new Sender(() => config.endpointUrl);
        this.channel = new Channel(() => config.disableAppInsights, () => config.maxBatchSize, () => config.maxBatchIntervalMs, sender);
    }

    /**
     * Log a trace message
     * @param telemetry      Object encapsulating tracking options
     */
    public trackTrace(telemetry: TraceTelemetry): void {
        this.track(telemetry, Contracts.DataTypes.MESSAGE);
    }

    /**
     * Log a numeric value that is not associated with a specific event. Typically used to send regular reports of performance indicators.
     * To send a single measurement, use just the first two parameters. If you take measurements very frequently, you can reduce the
     * telemetry bandwidth by aggregating multiple measurements and sending the resulting average at intervals.
     * @param telemetry      Object encapsulating tracking options
     */
    public trackMetric(telemetry: MetricTelemetry): void {
        this.track(telemetry, Contracts.DataTypes.METRIC);
    }

    /**
     * Log an exception
     * @param telemetry      Object encapsulating tracking options
     */
    public trackException(telemetry: ExceptionTelemetry): void {
        if (!Util.isError(telemetry.exception)) {
            telemetry.exception = new Error(<any>telemetry.exception);
        }
        this.track(telemetry, Contracts.DataTypes.EXCEPTION);
    }

    /*
    public trackRequest(telemetry: RequestTelemetry | HttpRequestTelemetry): void {

          ServerRequestTracking.trackRequestSync(this, request, response, ellapsedMilliseconds, properties, error);
    }
    */

    /**
     * Log a user action or other occurrence.
     * @param telemetry      Object encapsulating tracking options
     */
    public trackEvent(telemetry: EventTelemetry): void {

        this.track(telemetry, Contracts.DataTypes.EVENT);
    }

    /**
     * Log a user action or other occurrence.
     * @param telemetry      Object encapsulating tracking options
     */
    public trackRequest(telemetry: RequestTelemetry): void {
        this.track(telemetry, Contracts.DataTypes.REQUEST);
    }

    /**
     * Log a dependency. Note that the default client will attempt collect dependencies automatically so only use this for dependencies 
     * that aren't automatically captured or if you've disabled custom dependencies.
     * 
     * @param telemetry      Object encapsulating tracking option
     * */
    public trackDependency(telemetry: DependencyTelemetry) {

        if (!telemetry.target && telemetry.data) {
            telemetry.target = url.parse(telemetry.data).host;
        }
        this.track(telemetry, Contracts.DataTypes.REMOTE_DEPENDENCY);
    }

    /**
     * Immediately send all queued telemetry.
     */
    public sendPendingData(callback?: (v: string) => void) {
        this.channel.triggerSend(false, callback);
    }


    /**
     * Generic track method for all telemetry types
     * @param data the telemetry to send
     * @param tagOverrides the context tags to use for this telemetry which overwrite default context values
     */
    public track(telemetry: Telemetry, telemetryType: string) {

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

    /**
     * Sets the client app version to the context tags.
     * @param version, takes the host app version.
     */
    public overrideApplicationVersion(version: string) {
        this.context.tags[this.context.keys.applicationVersion] = version;
    }
}

export = Client;
