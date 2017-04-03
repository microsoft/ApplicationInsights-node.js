///<reference path="..\typings\globals\node\index.d.ts" />

import http = require("http");
import https = require("https");
import url = require("url");
import os = require("os");

import Config = require("./Config");
import Context = require("./Context");
import ExceptionTracking = require("../AutoCollection/Exceptions");
import ContractsModule = require("../Library/Contracts");
import Channel = require("./Channel");
import ServerRequestTracking = require("../AutoCollection/ServerRequests");
import ClientRequestTracking = require("../AutoCollection/ClientRequests");
import { CorrelationContextManager } from "../AutoCollection/CorrelationContextManager";
import Sender = require("./Sender");
import Util = require("./Util");
import Logging = require("./Logging");

class Client {
    private _telemetryProcessors: { (envelope: ContractsModule.Contracts.Envelope, contextObjects: {[name: string]: any;}): boolean; }[] = [];

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
     * Log a user action or other occurrence.
     * @param name              A string to identify this event in the portal.
     * @param properties        map[string, string] - additional data used to filter events and metrics in the portal. Defaults to empty.
     * @param measurements      map[string, number] - metrics associated with this event, displayed in Metrics Explorer on the portal. Defaults to empty.
     * @param tagOverrides      the context tags to use for this telemetry which overwrite default context values
     * @param contextObjects    map[string, contextObject] - An event-specific context that will be passed to telemetry processors handling this event before it is sent. For a context spanning your entire operation, consider appInsights.getCorrelationContext
     */
    public trackEvent(name: string, properties?: { [key: string]: string; }, measurements?: { [key: string]: number; }, 
        tagOverrides?: { [key: string]: string; },
        contextObjects?: { [name: string]: any; }) {
        var event = new ContractsModule.Contracts.EventData();
        event.name = name;
        event.properties = properties;
        event.measurements = measurements;

        var data = new ContractsModule.Contracts.Data<ContractsModule.Contracts.EventData>();
        data.baseType = "EventData";
        data.baseData = event;
        this.track(data, tagOverrides, contextObjects);
    }

    /**
     * Log a trace message
     * @param message        A string to identify this event in the portal.
     * @param properties     map[string, string] - additional data used to filter events and metrics in the portal. Defaults to empty.
     * @param tagOverrides   the context tags to use for this telemetry which overwrite default context values
     * @param contextObjects map[string, contextObject] - An event-specific context that will be passed to telemetry processors handling this event before it is sent. For a context spanning your entire operation, consider appInsights.getCorrelationContext
     */
    public trackTrace(message: string, severityLevel?: ContractsModule.Contracts.SeverityLevel, properties?: { [key: string]: string; }, 
        tagOverrides?: { [key: string]: string; },
        contextObjects?: { [name: string]: any; }) {
        var trace = new ContractsModule.Contracts.MessageData();
        trace.message = message;
        trace.properties = properties;
        if (!isNaN(severityLevel)) {
            trace.severityLevel = severityLevel;
        } else {
            trace.severityLevel = ContractsModule.Contracts.SeverityLevel.Information;
        }

        var data = new ContractsModule.Contracts.Data<ContractsModule.Contracts.MessageData>();
        data.baseType = "MessageData";
        data.baseData = trace;
        this.track(data, tagOverrides, contextObjects);
    }

    /**
     * Log an exception you have caught.
     * @param   exception   An Error from a catch clause, or the string error message.
     * @param   properties  map[string, string] - additional data used to filter events and metrics in the portal. Defaults to empty.
     * @param   measurements    map[string, number] - metrics associated with this event, displayed in Metrics Explorer on the portal. Defaults to empty.
     * @param   tagOverrides the context tags to use for this telemetry which overwrite default context values
     * @param   contextObjects        map[string, contextObject] - An event-specific context that will be passed to telemetry processors handling this event before it is sent. For a context spanning your entire operation, consider appInsights.getCorrelationContext
     */
    public trackException(exception: Error, properties?: { [key: string]: string; }, measurements?:{ [key: string]: number; }, 
        tagOverrides?: { [key: string]: string; },
        contextObjects?: { [name: string]: any; }) {
        if (!Util.isError(exception)) {
            exception = new Error(<any>exception);
        }

        var data = ExceptionTracking.getExceptionData(exception, true, properties, measurements);
        this.track(data, tagOverrides, contextObjects);
    }

    /**
     * Log a numeric value that is not associated with a specific event. Typically used to send regular reports of performance indicators.
     * To send a single measurement, use just the first two parameters. If you take measurements very frequently, you can reduce the
     * telemetry bandwidth by aggregating multiple measurements and sending the resulting average at intervals.
     *
     * @param name              A string that identifies the metric.
     * @param value             The value of the metric
     * @param count             the number of samples used to get this value
     * @param min               the min sample for this set
     * @param max               the max sample for this set
     * @param stdDev            the standard deviation of the set
     * @param properties        map[string, string] - additional data used to filter events and metrics in the portal. Defaults to empty.
     * @param tagOverrides      the context tags to use for this telemetry which overwrite default context values
     * @param contextObjects    map[string, contextObject] - An event-specific context that will be passed to telemetry processors handling this event before it is sent. For a context spanning your entire operation, consider appInsights.getCorrelationContext
     */
    public trackMetric(name: string, value: number, count?: number, min?: number, max?: number, stdDev?: number, properties?: { [key: string]: string; }, 
        tagOverrides?: { [key: string]: string; },
        contextObjects?: { [name: string]: any; }) {
        var metrics = new ContractsModule.Contracts.MetricData(); // todo: enable client-batching of these
        metrics.metrics = [];

        var metric = new ContractsModule.Contracts.DataPoint();
        metric.count = !isNaN(count) ? count : 1;
        metric.kind = ContractsModule.Contracts.DataPointType.Aggregation;
        metric.max = !isNaN(max) ? max : value;
        metric.min = !isNaN(min) ? min : value;
        metric.name = name;
        metric.stdDev = !isNaN(stdDev) ? stdDev : 0;
        metric.value = value;

        metrics.metrics.push(metric);

        metrics.properties = properties;

        var data = new ContractsModule.Contracts.Data<ContractsModule.Contracts.MetricData>();
        data.baseType = "MetricData";
        data.baseData = metrics;
        this.track(data, tagOverrides, contextObjects);
    }

    /**
     * Log an incoming request. This method will synchronously record the event, rather than waiting for response send.
     * Use this when you need to perform custom logic to record the duration of the request.
     * 
     * This call will also add outgoing headers to the supplied response object for correlating telemetry across different services.
     * @param request              http.ServerRequest - the request object to monitor
     * @param response             http.ServerResponse - the response object to monitor
     * @param elapsedMilliseconds  number - the elapsed time taken to handle this request in milliseconds
     * @param properties           map[string, string] - additional data used for filtering in the portal. Defaults to empty.
     * @param error                any - an object indicating the request was unsuccessful. This object will be recorded with the request telemetry.
     */
    public trackRequestSync(request: http.ServerRequest, response: http.ServerResponse, ellapsedMilliseconds?: number, properties?: { [key: string]: string; }, error?: any) {
        ServerRequestTracking.trackRequestSync(this, request, response, ellapsedMilliseconds, properties, error);
    }

    /**
     * Log an incoming request. Use this at the beginning of your request handling code.
     * This method will monitor a supplied response object and send telemetry after the response is sent,
     * recording elapsed time from the start of this call to the request being sent back to the user.
     * 
     * This call will also add outgoing headers to the supplied response object for correlating telemetry across different services.
     * @param request     http.ServerRequest - the request object to monitor
     * @param response    http.ServerResponse - the response object to monitor
     * @param properties  map[string, string] - additional data used for filtering in the portal. Defaults to empty.
     */
    public trackRequest(request: http.ServerRequest, response: http.ServerResponse, properties?: { [key: string]: string; }) {
        ServerRequestTracking.trackRequest(this, request, response, properties);
    }

    /**
     * Log an outgoing ClientRequest dependency. This is a helper method around trackDependency for common outgoing HTTP calls.
     * Use this at the beginning of your request.
     * 
     * This call will also add outgoing headers to your request for correlating telemetry across different services.
     * @param request    string | http.RequestOptions  | https.RequestOptions - the options used for this request
     * @param response   http.ClientRequest - the outgoing request to monitor
     * @param properties map[string, string] - additional data used for filtering in the portal. Defaults to empty.
     */
    public trackDependencyRequest(requestOptions: string | http.RequestOptions | https.RequestOptions, request: http.ClientRequest, properties?: { [key: string]: string; }) {
        ClientRequestTracking.trackRequest(this, requestOptions, request, properties);
    }

    /**
     * Log a dependency. Note that the default client will attempt collect dependencies automatically so only use this for dependencies 
     * that aren't automatically captured or if you've disabled custom dependencies.
     * 
     * @param name                  String that identifies the dependency
     * @param commandName           String of the name of the command made against the dependency
     * @param elapsedTimeMs         Number for elapsed time in milliseconds of the command made against the dependency 
     * @param success               Boolean which indicates success
     * @param dependencyTypeName    String which denotes dependency type. Defaults to null.
     * @param properties            map[string, string] - additional data used to filter events and metrics in the portal. Defaults to empty.
     * @param async                 boolean - never used
     * @param target                String of the target host of the dependency
     * @param tagOverrides          the context tags to use for this telemetry which overwrite default context values
     * @param contextObjects        map[string, contextObject] - An event-specific context that will be passed to telemetry processors handling this event before it is sent. For a context spanning your entire operation, consider appInsights.getCorrelationContext
     */
    public trackDependency(
        name: string,
        commandName: string,
        elapsedTimeMs: number,
        success: boolean,
        dependencyTypeName?: string,
        properties = {},
        async = false,
        target: string = null, 
        tagOverrides?: { [key: string]: string; },
        contextObjects?: { [name: string]: any; }) {

        if (!target && commandName) {
            target = url.parse(commandName).host;
        }

        var remoteDependency = new ContractsModule.Contracts.RemoteDependencyData();
        remoteDependency.name = name;
        remoteDependency.data = commandName;
        remoteDependency.target = target;
        remoteDependency.duration = Util.msToTimeSpan(elapsedTimeMs);
        remoteDependency.success = success;
        remoteDependency.type = dependencyTypeName;
        remoteDependency.properties = properties;

        var data = new ContractsModule.Contracts.Data<ContractsModule.Contracts.RemoteDependencyData>();
        data.baseType = "RemoteDependencyData";
        data.baseData = remoteDependency;
        this.track(data, tagOverrides, contextObjects);
    }

    /**
     * Immediately send all queued telemetry.
     */
    public sendPendingData(callback?: (string) => void) {
        this.channel.triggerSend(false, callback);
    }

    public getEnvelope(
        data: ContractsModule.Contracts.Data<ContractsModule.Contracts.Domain>,
        tagOverrides?: { [key: string]: string; }) {
        if (data && data.baseData) {
            data.baseData.ver = 2;

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

        var iKey = this.config.instrumentationKey;
        var envelope = new ContractsModule.Contracts.Envelope();
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
        return envelope;
    }

    /**
     * Generic track method for all telemetry types
     * @param data the telemetry to send
     * @param tagOverrides the context tags to use for this telemetry which overwrite default context values
     */
    public track(
        data: ContractsModule.Contracts.Data<ContractsModule.Contracts.Domain>,
        tagOverrides?: { [key: string]: string; },
        contextObjects?: { [name: string]: any; }) {

        var envelope = this.getEnvelope(data, tagOverrides);
        var accepted = this.runTelemetryProcessors(envelope, contextObjects);

        if (accepted) {
            this.channel.send(envelope);
        }
    }

    /**
     * Adds telemetry processor to the collection. Telemetry processors will be called one by one
     * before telemetry item is pushed for sending and in the order they were added.
     *
     * @param telemetryProcessor function, takes Envelope, and optional context object and returns boolean
     */
    public addTelemetryProcessor(telemetryProcessor: (envelope: ContractsModule.Contracts.Envelope, contextObjects?: { [name: string]: any; }) => boolean) {
        this._telemetryProcessors.push(telemetryProcessor);
    }

    /*
     * Removes all telemetry processors
     */
    public clearTelemetryProcessors() {
        this._telemetryProcessors = [];
    }
    
    private runTelemetryProcessors(envelope: ContractsModule.Contracts.Envelope, contextObjects: { [name: string]: any; }): boolean {
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
                accepted = false;
                Logging.warn("One of telemetry processors failed, telemetry item will not be sent.", error, envelope);
            }
        }

        return accepted;
    }

    private getTags(tagOverrides?: { [key: string]: string; }){
        var correlationContext = CorrelationContextManager.getCurrentContext();

        // Make a copy of context tags so we don't alter the actual object
        // Also perform tag overriding
        var newTags = <{[key: string]:string}>{};
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
}

export = Client;
