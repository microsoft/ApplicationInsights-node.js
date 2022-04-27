import * as Constants from "../constants";

export class AggregatedMetric {
  public name: string;

  public metricType: Constants.MetricId;

  public dimensions: { [key: string]: any };

  public value: number;

  public count: number;

  public aggregationInterval: number;
}
