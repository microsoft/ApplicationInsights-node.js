///<reference path="..\Declarations\node\node.d.ts" />

import http = require("http");

import Config = require("./Config");
import Context = require("./Context");
import ExceptionTracking = require("../AutoCollection/Exceptions");
import ContractsModule = require("../Library/Contracts");
import Channel = require("./Channel");
import RequestTracking = require("../AutoCollection/Requests");
import Sender = require("./Sender");
import Util = require("./Util");

class Client {

    private static _sequenceNumber = 0;

    public config:Config;
    public context:Context;
    public commonProperties:{ [key: string]: string; };
    public channel:Channel;

    /**
     * Constructs a new client of the client
     * @param iKey the instrumentation key to use (read from environment variable if not specified)
     */
    constructor(iKey?:string) {
        var config = new Config(iKey);
        this.config = config;
        this.context = new Context();
        this.commonProperties = {};

        var sender = new Sender(() => config.endpointUrl);
        this.channel = new Channel(() => config.disableAppInsights, () => config.maxBatchSize, () => config.maxBatchIntervalMs, sender);
    }

    /**
     * Log a user action or other occurrence.
     * @param   name    A string to identify this event in the portal.
     * @param   properties  map[string, string] - additional data used to filter events and metrics in the portal. Defaults to empty.
     * @param   measurements    map[string, number] - metrics associated with this event, displayed in Metrics Explorer on the portal. Defaults to empty.
     */
    public trackEvent(name:string, properties?:{ [key: string]: string; }, measurements?:{ [key: string]: number; }) {
        var event = new ContractsModule.Contracts.EventData();
        event.name = name;
        event.properties = properties;
        event.measurements = measurements;

        var data = new ContractsModule.Contracts.Data<ContractsModule.Contracts.EventData>();
        data.baseType = "EventData";
        data.baseData = event;
        this.track(data);
    }

    /**
     * Log a trace message
     * @param   message    A string to identify this event in the portal.
     * @param   properties  map[string, string] - additional data used to filter events and metrics in the portal. Defaults to empty.
     */
    public trackTrace(message:string, severityLevel?: ContractsModule.Contracts.SeverityLevel, properties?:{ [key: string]: string; }) {
        var trace = new ContractsModule.Contracts.MessageData();
        trace.message = message;
        trace.properties = properties;
        if(!isNaN(severityLevel)) {
            trace.severityLevel = severityLevel;
        } else {
            trace.severityLevel = ContractsModule.Contracts.SeverityLevel.Information;
        }

        var data = new ContractsModule.Contracts.Data<ContractsModule.Contracts.MessageData>();
        data.baseType = "MessageData";
        data.baseData = trace;
        this.track(data);
    }

    /**
     * Log an exception you have caught.
     * @param   exception   An Error from a catch clause, or the string error message.
     * @param   properties  map[string, string] - additional data used to filter events and metrics in the portal. Defaults to empty.
     * @param   measurements    map[string, number] - metrics associated with this event, displayed in Metrics Explorer on the portal. Defaults to empty.
     */
    public trackException(exception:Error, properties?:{ [key: string]: string; }) {
        if(!Util.isError(exception)) {
            exception = new Error(<any>exception);
        }

        var data = ExceptionTracking.getExceptionData(exception, true, properties)
        this.track(data);
    }

    /**
     * * Log a numeric value that is not associated with a specific event. Typically used to send regular reports of performance indicators.
     * To send a single measurement, use just the first two parameters. If you take measurements very frequently, you can reduce the
     * telemetry bandwidth by aggregating multiple measurements and sending the resulting average at intervals.
     *
     * @param name   A string that identifies the metric.
     * @param value  The value of the metric
     * @param count  the number of samples used to get this value
     * @param min    the min sample for this set
     * @param max    the max sample for this set
     * @param stdDev the standard deviation of the set
     */
    public trackMetric(name:string, value:number, count?:number, min?: number, max?: number, stdDev?: number) {
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

        var data = new ContractsModule.Contracts.Data<ContractsModule.Contracts.MetricData>();
        data.baseType = "MetricData";
        data.baseData = metrics;
        this.track(data);
    }

    public trackRequest(request: http.ServerRequest, response: http.ServerResponse, properties?:{ [key: string]: string; }) {
        RequestTracking.trackRequest(this, request, response, properties);
    }

    public trackDependency(
        name: string,
        commandName: string,
        elapsedTimeMs: number,
        success: boolean,
        dependencyTypeName?: string,
        properties = {},
        dependencyKind = ContractsModule.Contracts.DependencyKind.Other,
        async = false,
        dependencySource = ContractsModule.Contracts.DependencySourceType.Undefined)
    {
        var remoteDependency = new ContractsModule.Contracts.RemoteDependencyData();
        remoteDependency.name = name;
        remoteDependency.commandName = commandName;
        remoteDependency.value = elapsedTimeMs;
        remoteDependency.success = success;
        remoteDependency.dependencyTypeName = dependencyTypeName;
        remoteDependency.properties = properties;
        remoteDependency.dependencyKind = dependencyKind;
        remoteDependency.async = async;
        remoteDependency.dependencySource = dependencySource;

        var data = new ContractsModule.Contracts.Data<ContractsModule.Contracts.RemoteDependencyData>();
        data.baseType = "RemoteDependencyData";
        data.baseData = remoteDependency;
	this.track(data);
    }

    /**
     * Immediately send all queued telemetry.
     */
    public sendPendingData(callback?: (string) => void) {
        this.channel.triggerSend(false, callback);
    }

    public getEnvelope(
        data:ContractsModule.Contracts.Data<ContractsModule.Contracts.Domain>,
        tagOverrides?:{ [key: string]: string; }) {

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
        envelope.appVer = this.context.tags[this.context.keys.applicationVersion];
        envelope.iKey = iKey;

        // this is kind of a hack, but the envelope name is always the same as the data name sans the chars "data"
        envelope.name =
            "Microsoft.ApplicationInsights." +
            iKey.replace("-", "") +
            "." +
            data.baseType.substr(0, data.baseType.length - 4);
        envelope.os = this.context.tags[this.context.keys.deviceOS];
        envelope.osVer = this.context.tags[this.context.keys.deviceOSVersion];
        envelope.seq = (Client._sequenceNumber++).toString();
        envelope.tags = tagOverrides || this.context.tags;
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
        data:ContractsModule.Contracts.Data<ContractsModule.Contracts.Domain>,
        tagOverrides?:{ [key: string]: string; }) {

        var envelope = this.getEnvelope(data, tagOverrides);
        this.channel.send(envelope);
    }
}

export = Client;
