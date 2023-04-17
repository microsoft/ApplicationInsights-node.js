import { MetricBaseDimensions } from "./AggregatedMetricDimensions";
export declare class AggregatedMetricCounter {
    time: number;
    lastTime: number;
    totalCount: number;
    lastTotalCount: number;
    intervalExecutionTime: number;
    lastIntervalExecutionTime: number;
    dimensions: MetricBaseDimensions;
    constructor(dimensions: MetricBaseDimensions);
}
