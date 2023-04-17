import Constants = require("../Constants");
export declare class AggregatedMetric {
    name: string;
    metricType: Constants.MetricId;
    dimensions: {
        [key: string]: any;
    };
    value: number;
    count: number;
    aggregationInterval: number;
}
