import http = require("http");
import https = require("https");
import url = require("url");
import os = require("os");

import Config = require("./Config");
import Context = require("./Context");
import ExceptionTracking = require("../AutoCollection/Exceptions");
import Contracts = require("../Declarations/Contracts");
import Channel = require("./Channel");
import ServerRequestTracking = require("../AutoCollection/ServerRequests");
import ClientRequestTracking = require("../AutoCollection/ClientRequests");
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
        var trace = new Contracts.MessageData();
        trace.message = telemetry.message;
        trace.properties = telemetry.properties;
        if (!isNaN(telemetry.severityLevel)) {
            trace.severityLevel = telemetry.severityLevel;
        } else {
            trace.severityLevel = Contracts.SeverityLevel.Information;
        }

        var data = new Contracts.Data<Contracts.MessageData>();
        data.baseType = Contracts.DataTypes.MESSAGE;
        data.baseData = trace;
        this.track(data, telemetry);
    }

    /**
     * Log a numeric value that is not associated with a specific event. Typically used to send regular reports of performance indicators.
     * To send a single measurement, use just the first two parameters. If you take measurements very frequently, you can reduce the
     * telemetry bandwidth by aggregating multiple measurements and sending the resulting average at intervals.
     * @param telemetry      Object encapsulating tracking options
     */
    public trackMetric(telemetry: MetricTelemetry): void {
        var metrics = new Contracts.MetricData(); // todo: enable client-batching of these
        metrics.metrics = [];

        var metric = new Contracts.DataPoint();
        metric.count = !isNaN(telemetry.count) ? telemetry.count : 1;
        metric.kind = Contracts.DataPointType.Aggregation;
        metric.max = !isNaN(telemetry.max) ? telemetry.max : telemetry.value;
        metric.min = !isNaN(telemetry.min) ? telemetry.min : telemetry.value;
        metric.name = telemetry.name;
        metric.stdDev = !isNaN(telemetry.stdDev) ? telemetry.stdDev : 0;
        metric.value = telemetry.value;

        metrics.metrics.push(metric);

        metrics.properties = telemetry.properties;

        var data = new Contracts.Data<Contracts.MetricData>();
        data.baseType = Contracts.DataTypes.METRIC;
        data.baseData = metrics;
        this.track(data, telemetry);
    }

    /**
     * Log an exception
     * @param telemetry      Object encapsulating tracking options
     */
    public trackException(telemetry: ExceptionTelemetry): void {
        if (!Util.isError(telemetry.exception)) {
            telemetry.exception = new Error(<any>telemetry.exception);
        }

        var data = ExceptionTracking.getExceptionData(telemetry.exception, true, telemetry.properties, telemetry.measurements);
        this.track(data, telemetry);

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
        var event = new Contracts.EventData();
        event.name = telemetry.eventName;
        event.properties = telemetry.properties;
        event.measurements = telemetry.measurements;

        var data = new Contracts.Data<Contracts.EventData>();
        data.baseType = Contracts.DataTypes.EVENT;
        data.baseData = event;
        this.track(data, telemetry);
    }

    /*
    public trackRequestSync(request: http.ServerRequest, response: http.ServerResponse, ellapsedMilliseconds?: number, properties?: { [key: string]: string; }, error?: any) {
        ServerRequestTracking.trackRequestSync(this, request, response, ellapsedMilliseconds, properties, error);
    }
    public trackRequest(request: http.ServerRequest, response: http.ServerResponse, properties?: { [key: string]: string; }) {
        ServerRequestTracking.trackRequest(this, request, response, properties);
    }
    public trackDependencyRequest(requestOptions: string | http.RequestOptions | https.RequestOptions, request: http.ClientRequest, properties?: { [key: string]: string; }) {
        ClientRequestTracking.trackRequest(this, requestOptions, request, properties);
    }
    */

    /**
     * Log a user action or other occurrence.
     * @param telemetry      Object encapsulating tracking options
     */
    public trackRequest(telemetry: RequestTelemetry): void {
        var requestData = new Contracts.RequestData();
        requestData.id = telemetry.id;
        requestData.name = telemetry.name;
        requestData.url = telemetry.url
        requestData.source = telemetry.source;
        requestData.duration = Util.msToTimeSpan(telemetry.duration);
        requestData.responseCode = telemetry.resultCode;
        requestData.success = telemetry.success
        requestData.properties = telemetry.properties;

        var data = new Contracts.Data<Contracts.RequestData>();
        data.baseType = Contracts.DataTypes.REQUEST;
        data.baseData = requestData;
        this.track(data, telemetry);
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

        var remoteDependency = new Contracts.RemoteDependencyData();
        remoteDependency.name = telemetry.name;
        remoteDependency.data = telemetry.data;
        remoteDependency.target = telemetry.target;
        remoteDependency.duration = Util.msToTimeSpan(telemetry.duration);
        remoteDependency.success = telemetry.success;
        remoteDependency.type = telemetry.dependencyTypeName;
        remoteDependency.properties = telemetry.properties;

        var data = new Contracts.Data<Contracts.RemoteDependencyData>();
        data.baseType = Contracts.DataTypes.REMOTE_DEPENDENCY;
        data.baseData = remoteDependency;
        this.track(data, telemetry);
    }

    /**
     * Immediately send all queued telemetry.
     */
    public sendPendingData(callback?: (v: string) => void) {
        this.channel.triggerSend(false, callback);
    }

    public getEnvelope(
        data: Contracts.Data<Contracts.Domain>,
        tagOverrides?: { [key: string]: string; }): Contracts.Envelope {
        if (Contracts.domainSupportsProperties(data.baseData)) { // Do instanceof check. TS will automatically cast and allow the properties property
            if (data && data.baseData) {
                // if no properties are specified just add the common ones
                if (!data.baseData.properties) {
                    data.baseData.properties = this.commonProperties;
                } else {
                    // otherwise, check each of the common ones
                    for (var name in this.commonProperties) {
                        // only override if the property `name` has not been set on this item
                        if (!data.baseData.properties[name]) {
                            data.baseData.properties[name] = this.commonProperties[name];
                        }
                    }
                }
            }

            // sanitize properties
            data.baseData.properties = Util.validateStringMap(data.baseData.properties);
        }

        var iKey = this.config.instrumentationKey;
        var envelope = new Contracts.Envelope();
        envelope.data = data;
        envelope.iKey = iKey;

        // this is kind of a hack, but the envelope name is always the same as the data name sans the chars "data"
        envelope.name =
            "Microsoft.ApplicationInsights." +
            iKey.replace(/-/g, "") +
            "." +
            data.baseType.substr(0, data.baseType.length - 4);
        envelope.tags = this.getTags(tagOverrides);
        envelope.time = (new Date()).toISOString();
        envelope.ver = 1;
        envelope.sampleRate = this.config.samplingPercentage;

        return envelope;
    }

    /**
     * Generic track method for all telemetry types
     * @param data the telemetry to send
     * @param tagOverrides the context tags to use for this telemetry which overwrite default context values
     */
    public track(telemetry: Telemetry) {

        var envelope = this.getEnvelope(data, telemetry.tagOverrides);

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

    private getTags(tagOverrides?: { [key: string]: string; }) {
        var correlationContext = CorrelationContextManager.getCurrentContext();

        // Make a copy of context tags so we don't alter the actual object
        // Also perform tag overriding
        var newTags = <{ [key: string]: string }>{};
        for (var key in this.context.tags) {
            newTags[key] = this.context.tags[key];
        }
        for (var key in tagOverrides) {
            newTags[key] = tagOverrides[key];
        }

        if (!correlationContext) {
            return newTags;
        }

        // Fill in internally-populated values if not already set
        if (correlationContext) {
            newTags[this.context.keys.operationId] = newTags[this.context.keys.operationId] || correlationContext.operation.id;
            newTags[this.context.keys.operationName] = newTags[this.context.keys.operationName] || correlationContext.operation.name;
            newTags[this.context.keys.operationParentId] = newTags[this.context.keys.operationParentId] || correlationContext.operation.parentId;
        }

        return newTags;
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
