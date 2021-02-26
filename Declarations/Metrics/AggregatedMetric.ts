import Constants = require("../Constants");

export class AggregatedMetric {

    public name: string;

    public metricType: Constants.MetricId;

    public dimensions: { [key: string]: any; };

    public value: number;

    public count: number;

    public aggregationInterval: number;
}