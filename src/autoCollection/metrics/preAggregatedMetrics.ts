import { MetricHandler } from "../../library/handlers/metricHandler";
import * as Constants from "../../declarations/constants";
import {
    AggregatedMetric,
    AggregatedMetricCounter,
    IMetricBaseDimensions,
    IMetricDependencyDimensions,
    IMetricExceptionDimensions,
    IMetricRequestDimensions,
    IMetricTraceDimensions,
    MetricDimensionTypeKeys,
    MetricId
} from "./types";
import * as Contracts from "../../declarations/contracts";

// Names expected in Breeze side for dimensions
const PreAggregatedMetricPropertyNames: { [key in MetricDimensionTypeKeys]: string } = {
    cloudRoleInstance: "cloud/roleInstance",
    cloudRoleName: "cloud/roleName",
    operationSynthetic: "operation/synthetic",
    requestSuccess: "Request.Success",
    requestResultCode: "request/resultCode",
    dependencyType: "Dependency.Type",
    dependencyTarget: "dependency/target",
    dependencySuccess: "Dependency.Success",
    dependencyResultCode: "dependency/resultCode",
    traceSeverityLevel: "trace/severityLevel",
};

export class AutoCollectPreAggregatedMetrics {
    private _collectionInterval: number;
    private _handler: MetricHandler;
    private _handle: NodeJS.Timer;
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _dependencyCountersCollection: Array<AggregatedMetricCounter>;
    private _requestCountersCollection: Array<AggregatedMetricCounter>;
    private _exceptionCountersCollection: Array<AggregatedMetricCounter>;
    private _traceCountersCollection: Array<AggregatedMetricCounter>;

    /**
     * @param client - Telemetry Client
     * @param collectionInterval - Metric collection interval in ms
     */
    constructor(handler: MetricHandler, collectionInterval = 60000) {
        this._dependencyCountersCollection = [];
        this._requestCountersCollection = [];
        this._exceptionCountersCollection = [];
        this._traceCountersCollection = [];
        this._handler = handler;
        this._collectionInterval = collectionInterval;
    }

    public enable(isEnabled: boolean, collectionInterval?: number) {
        this._isEnabled = isEnabled;
        if (this._isEnabled && !this._isInitialized) {
            this._isInitialized = true;
        }

        if (isEnabled) {
            if (!this._handle) {
                this._collectionInterval = collectionInterval || this._collectionInterval;
                this._handle = setInterval(
                    () => this._trackPreAggregatedMetrics(),
                    this._collectionInterval
                );
                this._handle.unref(); // Allow the app to terminate even while this loop is going on
            }
        } else {
            if (this._handle) {
                clearInterval(this._handle);
                this._handle = undefined;
            }
        }
    }

    public countException(dimensions: IMetricExceptionDimensions) {
        if (!this._isEnabled) {
            return;
        }
        let counter: AggregatedMetricCounter = this._getAggregatedCounter(
            dimensions,
            this._exceptionCountersCollection
        );
        counter.totalCount++;
    }

    public countTrace(dimensions: IMetricTraceDimensions) {
        if (!this._isEnabled) {
            return;
        }
        let counter: AggregatedMetricCounter = this._getAggregatedCounter(
            dimensions,
            this._traceCountersCollection
        );
        counter.totalCount++;
    }

    public countRequest(duration: number | string, dimensions: IMetricRequestDimensions) {
        if (!this._isEnabled) {
            return;
        }
        let durationMs: number;
        let counter: AggregatedMetricCounter = this._getAggregatedCounter(
            dimensions,
            this._requestCountersCollection
        );
        if (typeof duration === "string") {
            // dependency duration is passed in as "00:00:00.123" by auto collectors
            durationMs = +new Date("1970-01-01T" + duration + "Z"); // convert to num ms, returns NaN if wrong
        } else if (typeof duration === "number") {
            durationMs = duration;
        } else {
            return;
        }
        counter.intervalExecutionTime += durationMs;
        counter.totalCount++;
    }

    public countDependency(duration: number | string, dimensions: IMetricDependencyDimensions) {
        if (!this._isEnabled) {
            return;
        }
        let counter: AggregatedMetricCounter = this._getAggregatedCounter(
            dimensions,
            this._dependencyCountersCollection
        );
        let durationMs: number;
        if (typeof duration === "string") {
            // dependency duration is passed in as "00:00:00.123" by auto collectors
            durationMs = +new Date("1970-01-01T" + duration + "Z"); // convert to num ms, returns NaN if wrong
        } else if (typeof duration === "number") {
            durationMs = duration;
        } else {
            return;
        }
        counter.intervalExecutionTime += durationMs;
        counter.totalCount++;
    }

    private _trackPreAggregatedMetrics() {
        this._trackRequestMetrics();
        this._trackDependencyMetrics();
        this._trackExceptionMetrics();
        this._trackTraceMetrics();
    }

    private _getAggregatedCounter(
        dimensions: IMetricBaseDimensions,
        counterCollection: Array<AggregatedMetricCounter>
    ): AggregatedMetricCounter {
        let notMatch = false;
        // Check if counter with specified dimensions is available
        for (let i = 0; i < counterCollection.length; i++) {
            // Same object
            if (dimensions === counterCollection[i].dimensions) {
                return counterCollection[i];
            }
            // Different number of keys skip
            if (
                Object.keys(dimensions).length !==
                Object.keys(counterCollection[i].dimensions).length
            ) {
                continue;
            }
            // Check dimension values
            for (let dim in dimensions) {
                if ((<any>dimensions)[dim] != (<any>counterCollection[i].dimensions)[dim]) {
                    notMatch = true;
                    break;
                }
            }
            if (!notMatch) {
                // Found
                return counterCollection[i];
            }
            notMatch = false;
        }
        // Create a new one if not found
        let newCounter = new AggregatedMetricCounter(dimensions);
        counterCollection.push(newCounter);
        return newCounter;
    }

    private _trackRequestMetrics() {
        for (let i = 0; i < this._requestCountersCollection.length; i++) {
            var currentCounter = this._requestCountersCollection[i];
            currentCounter.time = +new Date();
            var intervalRequests = currentCounter.totalCount - currentCounter.lastTotalCount || 0;
            var elapsedMs = currentCounter.time - currentCounter.lastTime;
            var averageRequestExecutionTime =
                (currentCounter.intervalExecutionTime - currentCounter.lastIntervalExecutionTime) /
                intervalRequests || 0;
            currentCounter.lastIntervalExecutionTime = currentCounter.intervalExecutionTime; // reset
            if (elapsedMs > 0 && intervalRequests > 0) {
                this._trackPreAggregatedMetric({
                    name: "Server response time",
                    dimensions: currentCounter.dimensions,
                    value: averageRequestExecutionTime,
                    count: intervalRequests,
                    aggregationInterval: elapsedMs,
                    metricType: MetricId.REQUESTS_DURATION,
                });
            }
            // Set last counters
            currentCounter.lastTotalCount = currentCounter.totalCount;
            currentCounter.lastTime = currentCounter.time;
        }
    }

    private _trackDependencyMetrics() {
        for (let i = 0; i < this._dependencyCountersCollection.length; i++) {
            var currentCounter = this._dependencyCountersCollection[i];
            currentCounter.time = +new Date();
            var intervalDependencies =
                currentCounter.totalCount - currentCounter.lastTotalCount || 0;
            var elapsedMs = currentCounter.time - currentCounter.lastTime;
            var averageDependencyExecutionTime =
                (currentCounter.intervalExecutionTime - currentCounter.lastIntervalExecutionTime) /
                intervalDependencies || 0;
            currentCounter.lastIntervalExecutionTime = currentCounter.intervalExecutionTime; // reset
            if (elapsedMs > 0 && intervalDependencies > 0) {
                this._trackPreAggregatedMetric({
                    name: "Dependency duration",
                    dimensions: currentCounter.dimensions,
                    value: averageDependencyExecutionTime,
                    count: intervalDependencies,
                    aggregationInterval: elapsedMs,
                    metricType: MetricId.DEPENDENCIES_DURATION,
                });
            }
            // Set last counters
            currentCounter.lastTotalCount = currentCounter.totalCount;
            currentCounter.lastTime = currentCounter.time;
        }
    }

    private _trackExceptionMetrics() {
        for (let i = 0; i < this._exceptionCountersCollection.length; i++) {
            var currentCounter = this._exceptionCountersCollection[i];
            currentCounter.time = +new Date();
            var intervalExceptions = currentCounter.totalCount - currentCounter.lastTotalCount || 0;
            var elapsedMs = currentCounter.time - currentCounter.lastTime;
            if (elapsedMs > 0 && intervalExceptions > 0) {
                this._trackPreAggregatedMetric({
                    name: "Exceptions",
                    dimensions: currentCounter.dimensions,
                    value: intervalExceptions,
                    count: intervalExceptions,
                    aggregationInterval: elapsedMs,
                    metricType: MetricId.EXCEPTIONS_COUNT,
                });
            }
            // Set last counters
            currentCounter.lastTotalCount = currentCounter.totalCount;
            currentCounter.lastTime = currentCounter.time;
        }
    }

    private _trackTraceMetrics() {
        for (let i = 0; i < this._traceCountersCollection.length; i++) {
            var currentCounter = this._traceCountersCollection[i];
            currentCounter.time = +new Date();
            var intervalTraces = currentCounter.totalCount - currentCounter.lastTotalCount || 0;
            var elapsedMs = currentCounter.time - currentCounter.lastTime;
            if (elapsedMs > 0 && intervalTraces > 0) {
                this._trackPreAggregatedMetric({
                    name: "Traces",
                    dimensions: currentCounter.dimensions,
                    value: intervalTraces,
                    count: intervalTraces,
                    aggregationInterval: elapsedMs,
                    metricType: MetricId.TRACES_COUNT,
                });
            }
            // Set last counters
            currentCounter.lastTotalCount = currentCounter.totalCount;
            currentCounter.lastTime = currentCounter.time;
        }
    }

    private _trackPreAggregatedMetric(metric: AggregatedMetric) {
        // Build metric properties
        let metricProperties: any = {};
        for (let dim in metric.dimensions) {
            metricProperties[PreAggregatedMetricPropertyNames[dim as MetricDimensionTypeKeys]] =
                metric.dimensions[dim];
        }
        metricProperties = {
            ...metricProperties,
            "_MS.MetricId": metric.metricType,
            "_MS.AggregationIntervalMs": String(metric.aggregationInterval),
            "_MS.IsAutocollected": "True",
        };

        let telemetry: Contracts.MetricTelemetry = {
            metrics: [
                {
                    name: metric.name,
                    value: metric.value,
                    count: metric.count,

                    kind: "Aggregation",
                },
            ],
            properties: metricProperties,
        };
        this._handler.trackMetric(telemetry);
    }
}
