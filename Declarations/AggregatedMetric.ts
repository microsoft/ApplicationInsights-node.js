import Constants = require("./Constants");

export class AggregatedMetric {

    public name: string;

    public description: string;

    public metricType: Constants.MetricId;

    public dimensions: { [key: string]: any; };

    public value: number;

    public aggregationInterval: number;
}