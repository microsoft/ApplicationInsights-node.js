"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregatedMetricCounter = void 0;
var AggregatedMetricCounter = /** @class */ (function () {
    function AggregatedMetricCounter(dimensions) {
        this.dimensions = dimensions;
        this.totalCount = 0;
        this.lastTotalCount = 0;
        this.intervalExecutionTime = 0;
        this.lastTime = +new Date;
        this.lastIntervalExecutionTime = 0;
    }
    return AggregatedMetricCounter;
}());
exports.AggregatedMetricCounter = AggregatedMetricCounter;
//# sourceMappingURL=AggregatedMetricCounters.js.map