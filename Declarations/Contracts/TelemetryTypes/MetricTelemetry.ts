import { Telemetry }  from "./Telemetry";

/**
 * Telemetry encapsulating a custom metric, i.e. aggregated numeric values describing value, count, frequency and distribution of
 * of a particular indicator.
 */
export interface MetricTelemetry extends Telemetry {
    /**
     * A string that identifies the metric.
     */
    name: string;
    
    /**
     * Type of metric being sent, e.g. Pre-agg metrics have kind=Aggregation
     */
    kind?: "Aggregation";

    /**
     * The value of the metric
     */
    value: number;

    /**
     * The number of samples used to get this value
     */
    count?: number;

    /**
     * The min sample for this set
     */
    min?: number;

    /**
     * The max sample for this set
     */
    max?: number;

    /**
     * The standard deviation of the set
     */
    stdDev?: number;
}

export enum MetricId {
    Requests_Duration = "requests/duration",
    Requests_Count = "requests/count",
    Requests_Rate = "requests/rate",
    Dependencies_Duration = "dependencies/duration",
    Dependencies_Count = "dependencies/count",
    Dependencies_Rate = "dependencies/rate",
    Exceptions_Count = "exceptions/count",
}

export interface AggregatedMetricsProperties {
    "_MS.AggregationIntervalMs": string;
    "_MS.MetricId": MetricId;
    "_MS.IsAutocollected": "True" | "False",
};
