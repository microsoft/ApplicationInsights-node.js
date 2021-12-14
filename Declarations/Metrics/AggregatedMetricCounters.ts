import { IMetricBaseDimensions } from "./AggregatedMetricDimensions";

export class AggregatedMetricCounter {

    public time: number;

    public lastTime: number;

    public totalCount: number;

    public lastTotalCount: number;

    public intervalExecutionTime: number;

    public lastIntervalExecutionTime: number;

    public dimensions: IMetricBaseDimensions;

    constructor(dimensions: IMetricBaseDimensions) {
        this.dimensions = dimensions;
        this.totalCount = 0;
        this.lastTotalCount = 0;
        this.intervalExecutionTime = 0;
        this.lastTime = +new Date;
        this.lastIntervalExecutionTime = 0;
    }
}

