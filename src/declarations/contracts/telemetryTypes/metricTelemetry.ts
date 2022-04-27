import { Telemetry } from "./telemetry";

/**
 * Telemetry encapsulating a custom metric, i.e. aggregated numeric values describing value, count, frequency and distribution of
 * of a particular indicator.
 */
export interface MetricTelemetry extends Telemetry {
    /** List of metrics. Only one metric in the list is currently supported by Application Insights storage. If multiple data points were sent only the first one will be used. */
    metrics: MetricPointTelemetry[];
}

export interface MetricPointTelemetry {
    /**
     * A string that identifies the metric.
     */
    name: string;

    /**
     * The value of the metric
     */
    value: number;

    /**
     * A string that identifies the metric namespace.
     */
    namespace?: string;

    /**
     * Type of metric being sent, e.g. Pre-agg metrics have kind=Aggregation
     */
    kind?: string;

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
