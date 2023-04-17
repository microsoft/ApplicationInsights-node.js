"use strict";
var Contracts = require("../Declarations/Contracts");
var Util = require("./Util");
var CorrelationContextManager_1 = require("../AutoCollection/CorrelationContextManager");
var Logging = require("./Logging");
/**
 * Manages the logic of creating envelopes from Telemetry objects
 */
var EnvelopeFactory = /** @class */ (function () {
    function EnvelopeFactory() {
    }
    /**
     * Creates envelope ready to be sent by Channel
     * @param telemetry Telemetry data
     * @param telemetryType Type of telemetry
     * @param commonProperties Bag of custom common properties to be added to the envelope
     * @param context Client context
     * @param config Client configuration
     */
    EnvelopeFactory.createEnvelope = function (telemetry, telemetryType, commonProperties, context, config) {
        var data = null;
        switch (telemetryType) {
            case Contracts.TelemetryType.Trace:
                data = EnvelopeFactory.createTraceData(telemetry);
                break;
            case Contracts.TelemetryType.Dependency:
                data = EnvelopeFactory.createDependencyData(telemetry);
                break;
            case Contracts.TelemetryType.Event:
                data = EnvelopeFactory.createEventData(telemetry);
                break;
            case Contracts.TelemetryType.Exception:
                data = EnvelopeFactory.createExceptionData(telemetry);
                break;
            case Contracts.TelemetryType.Request:
                data = EnvelopeFactory.createRequestData(telemetry);
                break;
            case Contracts.TelemetryType.Metric:
                data = EnvelopeFactory.createMetricData(telemetry);
                break;
            case Contracts.TelemetryType.Availability:
                data = EnvelopeFactory.createAvailabilityData(telemetry);
                break;
            case Contracts.TelemetryType.PageView:
                data = EnvelopeFactory.createPageViewData(telemetry);
                break;
        }
        if (data && data.baseData) {
            if (Contracts.domainSupportsProperties(data.baseData)) { // Do instanceof check. TS will automatically cast and allow the properties property
                if (commonProperties) {
                    // if no properties are specified just add the common ones
                    if (!data.baseData.properties) {
                        data.baseData.properties = commonProperties;
                    }
                    else {
                        // otherwise, check each of the common ones
                        for (var name in commonProperties) {
                            // only override if the property `name` has not been set on this item
                            if (!data.baseData.properties[name]) {
                                data.baseData.properties[name] = commonProperties[name];
                            }
                        }
                    }
                }
                EnvelopeFactory.addAzureFunctionsCorrelationProperties(data.baseData.properties);
                if (data.baseData.properties) {
                    // sanitize properties
                    data.baseData.properties = Util.validateStringMap(data.baseData.properties);
                }
            }
        }
        var iKey = config ? config.instrumentationKey || "" : "";
        var envelope = new Contracts.Envelope();
        envelope.data = data;
        envelope.iKey = iKey;
        // this is kind of a hack, but the envelope name is always the same as the data name sans the chars "data"
        envelope.name =
            "Microsoft.ApplicationInsights." +
                iKey.replace(/-/g, "") +
                "." +
                data.baseType.substr(0, data.baseType.length - 4);
        envelope.tags = this.getTags(context, telemetry.tagOverrides);
        envelope.time = (new Date()).toISOString();
        envelope.ver = 1;
        envelope.sampleRate = config ? config.samplingPercentage : 100;
        // Exclude metrics from sampling by default
        if (telemetryType === Contracts.TelemetryType.Metric) {
            envelope.sampleRate = 100;
        }
        return envelope;
    };
    EnvelopeFactory.addAzureFunctionsCorrelationProperties = function (properties) {
        var correlationContext = CorrelationContextManager_1.CorrelationContextManager.getCurrentContext();
        if (correlationContext && correlationContext.customProperties && correlationContext.customProperties["getProperty"] instanceof Function) {
            properties = properties || {}; // Initialize properties if not present
            var property = correlationContext.customProperties.getProperty("InvocationId");
            if (property) {
                properties["InvocationId"] = property;
            }
            property = correlationContext.customProperties.getProperty("ProcessId");
            if (property) {
                properties["ProcessId"] = property;
            }
            property = correlationContext.customProperties.getProperty("LogLevel");
            if (property) {
                properties["LogLevel"] = property;
            }
            property = correlationContext.customProperties.getProperty("Category");
            if (property) {
                properties["Category"] = property;
            }
            property = correlationContext.customProperties.getProperty("HostInstanceId");
            if (property) {
                properties["HostInstanceId"] = property;
            }
            property = correlationContext.customProperties.getProperty("AzFuncLiveLogsSessionId");
            if (property) {
                properties["AzFuncLiveLogsSessionId"] = property;
            }
        }
    };
    EnvelopeFactory.truncateProperties = function (telemetry) {
        if (telemetry.properties) {
            try {
                var properties = {};
                var propertiesKeys = Object.keys(telemetry.properties);
                var propertiesValues = Object.values(telemetry.properties);
                for (var i = 0; i < propertiesKeys.length; i++) {
                    if (propertiesKeys[i].length <= 150) {
                        if (!Util.isDate(propertiesValues[i])) {
                            if (propertiesValues[i] == null) {
                                propertiesValues[i] = "";
                            }
                            if (typeof (propertiesValues[i]) === "object") {
                                propertiesValues[i] = Util.stringify(propertiesValues[i]);
                            }
                            properties[propertiesKeys[i]] = String(propertiesValues[i]).substring(0, 8192);
                        }
                        properties[propertiesKeys[i]] = propertiesValues[i];
                    }
                }
                return properties;
            }
            catch (error) {
                Logging.warn("Failed to properly truncate telemetry properties: ", error);
            }
        }
    };
    EnvelopeFactory.createTraceData = function (telemetry) {
        var _a;
        var trace = new Contracts.MessageData();
        trace.message = (_a = telemetry.message) === null || _a === void 0 ? void 0 : _a.substring(0, 32768);
        trace.properties = this.truncateProperties(telemetry);
        if (!isNaN(telemetry.severity)) {
            trace.severityLevel = telemetry.severity;
        }
        else {
            trace.severityLevel = Contracts.SeverityLevel.Information;
        }
        var data = new Contracts.Data();
        data.baseType = Contracts.telemetryTypeToBaseType(Contracts.TelemetryType.Trace);
        data.baseData = trace;
        return data;
    };
    EnvelopeFactory.createDependencyData = function (telemetry) {
        var _a, _b, _c;
        var remoteDependency = new Contracts.RemoteDependencyData();
        remoteDependency.name = (_a = telemetry.name) === null || _a === void 0 ? void 0 : _a.substring(0, 1024);
        remoteDependency.data = (_b = telemetry.data) === null || _b === void 0 ? void 0 : _b.substring(0, 8192);
        remoteDependency.target = (_c = telemetry.target) === null || _c === void 0 ? void 0 : _c.substring(0, 1024);
        remoteDependency.duration = Util.msToTimeSpan(telemetry.duration);
        remoteDependency.success = telemetry.success;
        remoteDependency.type = telemetry.dependencyTypeName;
        remoteDependency.properties = this.truncateProperties(telemetry);
        remoteDependency.resultCode = (telemetry.resultCode ? telemetry.resultCode.toString() : "0");
        if (telemetry.id) {
            remoteDependency.id = telemetry.id;
        }
        else {
            remoteDependency.id = Util.w3cTraceId();
        }
        var data = new Contracts.Data();
        data.baseType = Contracts.telemetryTypeToBaseType(Contracts.TelemetryType.Dependency);
        data.baseData = remoteDependency;
        return data;
    };
    EnvelopeFactory.createEventData = function (telemetry) {
        var _a;
        var event = new Contracts.EventData();
        event.name = (_a = telemetry.name) === null || _a === void 0 ? void 0 : _a.substring(0, 512);
        event.properties = this.truncateProperties(telemetry);
        event.measurements = telemetry.measurements;
        var data = new Contracts.Data();
        data.baseType = Contracts.telemetryTypeToBaseType(Contracts.TelemetryType.Event);
        data.baseData = event;
        return data;
    };
    EnvelopeFactory.createExceptionData = function (telemetry) {
        var _a, _b;
        var exception = new Contracts.ExceptionData();
        exception.properties = this.truncateProperties(telemetry);
        if (!isNaN(telemetry.severity)) {
            exception.severityLevel = telemetry.severity;
        }
        else {
            exception.severityLevel = Contracts.SeverityLevel.Error;
        }
        exception.measurements = telemetry.measurements;
        exception.exceptions = [];
        var stack = telemetry.exception["stack"];
        var exceptionDetails = new Contracts.ExceptionDetails();
        exceptionDetails.message = (_a = telemetry.exception.message) === null || _a === void 0 ? void 0 : _a.substring(0, 32768);
        exceptionDetails.typeName = (_b = telemetry.exception.name) === null || _b === void 0 ? void 0 : _b.substring(0, 1024);
        exceptionDetails.parsedStack = this.parseStack(stack);
        exceptionDetails.hasFullStack = Util.isArray(exceptionDetails.parsedStack) && exceptionDetails.parsedStack.length > 0;
        exception.exceptions.push(exceptionDetails);
        var data = new Contracts.Data();
        data.baseType = Contracts.telemetryTypeToBaseType(Contracts.TelemetryType.Exception);
        data.baseData = exception;
        return data;
    };
    EnvelopeFactory.createRequestData = function (telemetry) {
        var _a, _b, _c, _d;
        var requestData = new Contracts.RequestData();
        if (telemetry.id) {
            requestData.id = telemetry.id;
        }
        else {
            requestData.id = Util.w3cTraceId();
        }
        requestData.name = (_a = telemetry.name) === null || _a === void 0 ? void 0 : _a.substring(0, 1024);
        requestData.url = (_b = telemetry.url) === null || _b === void 0 ? void 0 : _b.substring(0, 2048);
        requestData.source = (_c = telemetry.source) === null || _c === void 0 ? void 0 : _c.substring(0, 1024);
        requestData.duration = Util.msToTimeSpan(telemetry.duration);
        requestData.responseCode = (_d = (telemetry.resultCode ? telemetry.resultCode.toString() : "0")) === null || _d === void 0 ? void 0 : _d.substring(0, 1024);
        requestData.success = telemetry.success;
        requestData.properties = this.truncateProperties(telemetry);
        requestData.measurements = telemetry.measurements;
        var data = new Contracts.Data();
        data.baseType = Contracts.telemetryTypeToBaseType(Contracts.TelemetryType.Request);
        data.baseData = requestData;
        return data;
    };
    EnvelopeFactory.createMetricData = function (telemetry) {
        var _a;
        var metrics = new Contracts.MetricData(); // todo: enable client-batching of these
        metrics.metrics = [];
        var metric = new Contracts.DataPoint();
        metric.count = !isNaN(telemetry.count) ? telemetry.count : 1;
        metric.kind = Contracts.DataPointType.Aggregation;
        metric.max = !isNaN(telemetry.max) ? telemetry.max : telemetry.value;
        metric.min = !isNaN(telemetry.min) ? telemetry.min : telemetry.value;
        metric.name = (_a = telemetry.name) === null || _a === void 0 ? void 0 : _a.substring(0, 1024);
        metric.stdDev = !isNaN(telemetry.stdDev) ? telemetry.stdDev : 0;
        metric.value = telemetry.value;
        metric.ns = telemetry.namespace;
        metrics.metrics.push(metric);
        metrics.properties = this.truncateProperties(telemetry);
        var data = new Contracts.Data();
        data.baseType = Contracts.telemetryTypeToBaseType(Contracts.TelemetryType.Metric);
        data.baseData = metrics;
        return data;
    };
    EnvelopeFactory.createAvailabilityData = function (telemetry) {
        var _a, _b;
        var availabilityData = new Contracts.AvailabilityData();
        if (telemetry.id) {
            availabilityData.id = telemetry.id;
        }
        else {
            availabilityData.id = Util.w3cTraceId();
        }
        availabilityData.name = (_a = telemetry.name) === null || _a === void 0 ? void 0 : _a.substring(0, 1024);
        availabilityData.duration = Util.msToTimeSpan(telemetry.duration);
        availabilityData.success = telemetry.success;
        availabilityData.runLocation = telemetry.runLocation;
        availabilityData.message = (_b = telemetry.message) === null || _b === void 0 ? void 0 : _b.substring(0, 8192);
        availabilityData.measurements = telemetry.measurements;
        availabilityData.properties = this.truncateProperties(telemetry);
        var data = new Contracts.Data();
        data.baseType = Contracts.telemetryTypeToBaseType(Contracts.TelemetryType.Availability);
        data.baseData = availabilityData;
        return data;
    };
    EnvelopeFactory.createPageViewData = function (telemetry) {
        var _a, _b;
        var pageViewData = new Contracts.PageViewData();
        pageViewData.name = (_a = telemetry.name) === null || _a === void 0 ? void 0 : _a.substring(0, 1024);
        pageViewData.duration = Util.msToTimeSpan(telemetry.duration);
        pageViewData.url = (_b = telemetry.url) === null || _b === void 0 ? void 0 : _b.substring(0, 2048);
        pageViewData.measurements = telemetry.measurements;
        pageViewData.properties = this.truncateProperties(telemetry);
        var data = new Contracts.Data();
        data.baseType = Contracts.telemetryTypeToBaseType(Contracts.TelemetryType.PageView);
        data.baseData = pageViewData;
        return data;
    };
    EnvelopeFactory.getTags = function (context, tagOverrides) {
        var correlationContext = CorrelationContextManager_1.CorrelationContextManager.getCurrentContext();
        // Make a copy of context tags so we don't alter the actual object
        // Also perform tag overriding
        var newTags = {};
        if (context && context.tags) {
            for (var key in context.tags) {
                newTags[key] = context.tags[key];
            }
        }
        if (tagOverrides) {
            for (var key in tagOverrides) {
                newTags[key] = tagOverrides[key];
            }
        }
        // Fill in internally-populated values if not already set
        if (correlationContext) {
            newTags[context.keys.operationId] = newTags[context.keys.operationId] || correlationContext.operation.id;
            newTags[context.keys.operationName] = newTags[context.keys.operationName] || correlationContext.operation.name;
            newTags[context.keys.operationParentId] = newTags[context.keys.operationParentId] || correlationContext.operation.parentId;
        }
        return newTags;
    };
    EnvelopeFactory.parseStack = function (stack) {
        var parsedStack = undefined;
        if (typeof stack === "string") {
            var frames = stack.split("\n");
            parsedStack = [];
            var level = 0;
            var totalSizeInBytes = 0;
            for (var i = 0; i <= frames.length; i++) {
                var frame = frames[i];
                if (_StackFrame.regex.test(frame)) {
                    var parsedFrame = new _StackFrame(frames[i], level++);
                    totalSizeInBytes += parsedFrame.sizeInBytes;
                    parsedStack.push(parsedFrame);
                }
            }
            // DP Constraint - exception parsed stack must be < 32KB
            // remove frames from the middle to meet the threshold
            var exceptionParsedStackThreshold = 32 * 1024;
            if (totalSizeInBytes > exceptionParsedStackThreshold) {
                var left = 0;
                var right = parsedStack.length - 1;
                var size = 0;
                var acceptedLeft = left;
                var acceptedRight = right;
                while (left < right) {
                    // check size
                    var lSize = parsedStack[left].sizeInBytes;
                    var rSize = parsedStack[right].sizeInBytes;
                    size += lSize + rSize;
                    if (size > exceptionParsedStackThreshold) {
                        // remove extra frames from the middle
                        var howMany = acceptedRight - acceptedLeft + 1;
                        parsedStack.splice(acceptedLeft, howMany);
                        break;
                    }
                    // update pointers
                    acceptedLeft = left;
                    acceptedRight = right;
                    left++;
                    right--;
                }
            }
        }
        return parsedStack;
    };
    return EnvelopeFactory;
}());
var _StackFrame = /** @class */ (function () {
    function _StackFrame(frame, level) {
        this.sizeInBytes = 0;
        this.level = level;
        this.method = "<no_method>";
        this.assembly = Util.trim(frame);
        var matches = frame.match(_StackFrame.regex);
        if (matches && matches.length >= 5) {
            this.method = Util.trim(matches[2]) || this.method;
            this.fileName = Util.trim(matches[4]) || "<no_filename>";
            this.line = parseInt(matches[5]) || 0;
        }
        this.sizeInBytes += this.method.length;
        this.sizeInBytes += this.fileName.length;
        this.sizeInBytes += this.assembly.length;
        // todo: these might need to be removed depending on how the back-end settles on their size calculation
        this.sizeInBytes += _StackFrame.baseSize;
        this.sizeInBytes += this.level.toString().length;
        this.sizeInBytes += this.line.toString().length;
    }
    // regex to match stack frames from ie/chrome/ff
    // methodName=$2, fileName=$4, lineNo=$5, column=$6
    _StackFrame.regex = /^(\s+at)?(.*?)(\@|\s\(|\s)([^\(\n]+):(\d+):(\d+)(\)?)$/;
    _StackFrame.baseSize = 58; //'{"method":"","level":,"assembly":"","fileName":"","line":}'.length
    return _StackFrame;
}());
module.exports = EnvelopeFactory;
//# sourceMappingURL=EnvelopeFactory.js.map