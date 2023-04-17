import TelemetryClient = require("../Library/TelemetryClient");
import { MetricDependencyDimensions, MetricExceptionDimensions, MetricRequestDimensions, MetricTraceDimensions } from "../Declarations/Metrics/AggregatedMetricDimensions";
declare class AutoCollectPreAggregatedMetrics {
    static INSTANCE: AutoCollectPreAggregatedMetrics;
    private _collectionInterval;
    private _client;
    private _handle;
    private _isEnabled;
    private _isInitialized;
    private static _dependencyCountersCollection;
    private static _requestCountersCollection;
    private static _exceptionCountersCollection;
    private static _traceCountersCollection;
    /**
     * @param client - Telemetry Client
     * @param collectionInterval - Metric collection interval in ms
     */
    constructor(client: TelemetryClient, collectionInterval?: number);
    enable(isEnabled: boolean, collectionInterval?: number): void;
    static countException(dimensions: MetricExceptionDimensions): void;
    static countTrace(dimensions: MetricTraceDimensions): void;
    static countRequest(duration: number | string, dimensions: MetricRequestDimensions): void;
    static countDependency(duration: number | string, dimensions: MetricDependencyDimensions): void;
    isInitialized(): boolean;
    static isEnabled(): boolean;
    trackPreAggregatedMetrics(): void;
    private static _getAggregatedCounter;
    private _trackRequestMetrics;
    private _trackDependencyMetrics;
    private _trackExceptionMetrics;
    private _trackTraceMetrics;
    private _trackPreAggregatedMetric;
    dispose(): void;
}
export = AutoCollectPreAggregatedMetrics;
