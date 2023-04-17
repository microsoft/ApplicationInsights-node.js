"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var Constants = require("../Declarations/Constants");
var AggregatedMetricCounters_1 = require("../Declarations/Metrics/AggregatedMetricCounters");
var AggregatedMetricDimensions_1 = require("../Declarations/Metrics/AggregatedMetricDimensions");
var AutoCollectPreAggregatedMetrics = /** @class */ (function () {
    /**
     * @param client - Telemetry Client
     * @param collectionInterval - Metric collection interval in ms
     */
    function AutoCollectPreAggregatedMetrics(client, collectionInterval) {
        if (collectionInterval === void 0) { collectionInterval = 60000; }
        if (!AutoCollectPreAggregatedMetrics.INSTANCE) {
            AutoCollectPreAggregatedMetrics.INSTANCE = this;
        }
        this._isInitialized = false;
        AutoCollectPreAggregatedMetrics._dependencyCountersCollection = [];
        AutoCollectPreAggregatedMetrics._requestCountersCollection = [];
        AutoCollectPreAggregatedMetrics._exceptionCountersCollection = [];
        AutoCollectPreAggregatedMetrics._traceCountersCollection = [];
        this._client = client;
        this._collectionInterval = collectionInterval;
    }
    AutoCollectPreAggregatedMetrics.prototype.enable = function (isEnabled, collectionInterval) {
        var _this = this;
        this._isEnabled = isEnabled;
        if (this._isEnabled && !this._isInitialized) {
            this._isInitialized = true;
        }
        if (isEnabled) {
            if (!this._handle) {
                this._collectionInterval = collectionInterval || this._collectionInterval;
                this._handle = setInterval(function () { return _this.trackPreAggregatedMetrics(); }, this._collectionInterval);
                this._handle.unref(); // Allow the app to terminate even while this loop is going on
            }
        }
        else {
            if (this._handle) {
                clearInterval(this._handle);
                this._handle = undefined;
            }
        }
    };
    AutoCollectPreAggregatedMetrics.countException = function (dimensions) {
        if (!AutoCollectPreAggregatedMetrics.isEnabled()) {
            return;
        }
        var counter = AutoCollectPreAggregatedMetrics._getAggregatedCounter(dimensions, this._exceptionCountersCollection);
        counter.totalCount++;
    };
    AutoCollectPreAggregatedMetrics.countTrace = function (dimensions) {
        if (!AutoCollectPreAggregatedMetrics.isEnabled()) {
            return;
        }
        var counter = AutoCollectPreAggregatedMetrics._getAggregatedCounter(dimensions, this._traceCountersCollection);
        counter.totalCount++;
    };
    AutoCollectPreAggregatedMetrics.countRequest = function (duration, dimensions) {
        if (!AutoCollectPreAggregatedMetrics.isEnabled()) {
            return;
        }
        var durationMs;
        var counter = AutoCollectPreAggregatedMetrics._getAggregatedCounter(dimensions, this._requestCountersCollection);
        if (typeof duration === "string") {
            // dependency duration is passed in as "00:00:00.123" by autocollectors
            durationMs = +new Date("1970-01-01T" + duration + "Z"); // convert to num ms, returns NaN if wrong
        }
        else if (typeof duration === "number") {
            durationMs = duration;
        }
        else {
            return;
        }
        counter.intervalExecutionTime += durationMs;
        counter.totalCount++;
    };
    AutoCollectPreAggregatedMetrics.countDependency = function (duration, dimensions) {
        if (!AutoCollectPreAggregatedMetrics.isEnabled()) {
            return;
        }
        var counter = AutoCollectPreAggregatedMetrics._getAggregatedCounter(dimensions, this._dependencyCountersCollection);
        var durationMs;
        if (typeof duration === "string") {
            // dependency duration is passed in as "00:00:00.123" by autocollectors
            durationMs = +new Date("1970-01-01T" + duration + "Z"); // convert to num ms, returns NaN if wrong
        }
        else if (typeof duration === "number") {
            durationMs = duration;
        }
        else {
            return;
        }
        counter.intervalExecutionTime += durationMs;
        counter.totalCount++;
    };
    AutoCollectPreAggregatedMetrics.prototype.isInitialized = function () {
        return this._isInitialized;
    };
    AutoCollectPreAggregatedMetrics.isEnabled = function () {
        return AutoCollectPreAggregatedMetrics.INSTANCE && AutoCollectPreAggregatedMetrics.INSTANCE._isEnabled;
    };
    AutoCollectPreAggregatedMetrics.prototype.trackPreAggregatedMetrics = function () {
        this._trackRequestMetrics();
        this._trackDependencyMetrics();
        this._trackExceptionMetrics();
        this._trackTraceMetrics();
    };
    AutoCollectPreAggregatedMetrics._getAggregatedCounter = function (dimensions, counterCollection) {
        var notMatch = false;
        // Check if counter with specified dimensions is available
        for (var i = 0; i < counterCollection.length; i++) {
            // Same object
            if (dimensions === counterCollection[i].dimensions) {
                return counterCollection[i];
            }
            // Diferent number of keys skip
            if (Object.keys(dimensions).length !== Object.keys(counterCollection[i].dimensions).length) {
                continue;
            }
            // Check dimension values
            for (var dim in dimensions) {
                if (dimensions[dim] != counterCollection[i].dimensions[dim]) {
                    notMatch = true;
                    break;
                }
            }
            if (!notMatch) { // Found
                return counterCollection[i];
            }
            notMatch = false;
        }
        // Create a new one if not found
        var newCounter = new AggregatedMetricCounters_1.AggregatedMetricCounter(dimensions);
        counterCollection.push(newCounter);
        return newCounter;
    };
    AutoCollectPreAggregatedMetrics.prototype._trackRequestMetrics = function () {
        for (var i = 0; i < AutoCollectPreAggregatedMetrics._requestCountersCollection.length; i++) {
            var currentCounter = AutoCollectPreAggregatedMetrics._requestCountersCollection[i];
            currentCounter.time = +new Date;
            var intervalRequests = (currentCounter.totalCount - currentCounter.lastTotalCount) || 0;
            var elapsedMs = currentCounter.time - currentCounter.lastTime;
            var averageRequestExecutionTime = ((currentCounter.intervalExecutionTime - currentCounter.lastIntervalExecutionTime) / intervalRequests) || 0;
            currentCounter.lastIntervalExecutionTime = currentCounter.intervalExecutionTime; // reset
            if (elapsedMs > 0 && intervalRequests > 0) {
                this._trackPreAggregatedMetric({
                    name: "Server response time",
                    dimensions: currentCounter.dimensions,
                    value: averageRequestExecutionTime,
                    count: intervalRequests,
                    aggregationInterval: elapsedMs,
                    metricType: Constants.MetricId.REQUESTS_DURATION
                });
            }
            // Set last counters
            currentCounter.lastTotalCount = currentCounter.totalCount;
            currentCounter.lastTime = currentCounter.time;
        }
    };
    AutoCollectPreAggregatedMetrics.prototype._trackDependencyMetrics = function () {
        for (var i = 0; i < AutoCollectPreAggregatedMetrics._dependencyCountersCollection.length; i++) {
            var currentCounter = AutoCollectPreAggregatedMetrics._dependencyCountersCollection[i];
            currentCounter.time = +new Date;
            var intervalDependencies = (currentCounter.totalCount - currentCounter.lastTotalCount) || 0;
            var elapsedMs = currentCounter.time - currentCounter.lastTime;
            var averageDependencyExecutionTime = ((currentCounter.intervalExecutionTime - currentCounter.lastIntervalExecutionTime) / intervalDependencies) || 0;
            currentCounter.lastIntervalExecutionTime = currentCounter.intervalExecutionTime; // reset
            if (elapsedMs > 0 && intervalDependencies > 0) {
                this._trackPreAggregatedMetric({
                    name: "Dependency duration",
                    dimensions: currentCounter.dimensions,
                    value: averageDependencyExecutionTime,
                    count: intervalDependencies,
                    aggregationInterval: elapsedMs,
                    metricType: Constants.MetricId.DEPENDENCIES_DURATION
                });
            }
            // Set last counters
            currentCounter.lastTotalCount = currentCounter.totalCount;
            currentCounter.lastTime = currentCounter.time;
        }
    };
    AutoCollectPreAggregatedMetrics.prototype._trackExceptionMetrics = function () {
        for (var i = 0; i < AutoCollectPreAggregatedMetrics._exceptionCountersCollection.length; i++) {
            var currentCounter = AutoCollectPreAggregatedMetrics._exceptionCountersCollection[i];
            currentCounter.time = +new Date;
            var intervalExceptions = (currentCounter.totalCount - currentCounter.lastTotalCount) || 0;
            var elapsedMs = currentCounter.time - currentCounter.lastTime;
            if (elapsedMs > 0 && intervalExceptions > 0) {
                this._trackPreAggregatedMetric({
                    name: "Exceptions",
                    dimensions: currentCounter.dimensions,
                    value: intervalExceptions,
                    count: intervalExceptions,
                    aggregationInterval: elapsedMs,
                    metricType: Constants.MetricId.EXCEPTIONS_COUNT
                });
            }
            // Set last counters
            currentCounter.lastTotalCount = currentCounter.totalCount;
            currentCounter.lastTime = currentCounter.time;
        }
    };
    AutoCollectPreAggregatedMetrics.prototype._trackTraceMetrics = function () {
        for (var i = 0; i < AutoCollectPreAggregatedMetrics._traceCountersCollection.length; i++) {
            var currentCounter = AutoCollectPreAggregatedMetrics._traceCountersCollection[i];
            currentCounter.time = +new Date;
            var intervalTraces = (currentCounter.totalCount - currentCounter.lastTotalCount) || 0;
            var elapsedMs = currentCounter.time - currentCounter.lastTime;
            if (elapsedMs > 0 && intervalTraces > 0) {
                this._trackPreAggregatedMetric({
                    name: "Traces",
                    dimensions: currentCounter.dimensions,
                    value: intervalTraces,
                    count: intervalTraces,
                    aggregationInterval: elapsedMs,
                    metricType: Constants.MetricId.TRACES_COUNT
                });
            }
            // Set last counters
            currentCounter.lastTotalCount = currentCounter.totalCount;
            currentCounter.lastTime = currentCounter.time;
        }
    };
    AutoCollectPreAggregatedMetrics.prototype._trackPreAggregatedMetric = function (metric) {
        // Build metric properties
        var metricProperties = {};
        for (var dim in metric.dimensions) {
            metricProperties[AggregatedMetricDimensions_1.PreaggregatedMetricPropertyNames[dim]] = metric.dimensions[dim];
        }
        metricProperties = __assign(__assign({}, metricProperties), { "_MS.MetricId": metric.metricType, "_MS.AggregationIntervalMs": String(metric.aggregationInterval), "_MS.IsAutocollected": "True" });
        var telemetry = {
            name: metric.name,
            value: metric.value,
            count: metric.count,
            properties: metricProperties,
            kind: "Aggregation"
        };
        this._client.trackMetric(telemetry);
    };
    AutoCollectPreAggregatedMetrics.prototype.dispose = function () {
        AutoCollectPreAggregatedMetrics.INSTANCE = null;
        this.enable(false);
        this._isInitialized = false;
    };
    return AutoCollectPreAggregatedMetrics;
}());
module.exports = AutoCollectPreAggregatedMetrics;
//# sourceMappingURL=PreAggregatedMetrics.js.map