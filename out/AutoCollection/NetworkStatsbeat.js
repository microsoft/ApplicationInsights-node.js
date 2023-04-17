"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkStatsbeat = void 0;
var NetworkStatsbeat = /** @class */ (function () {
    function NetworkStatsbeat(endpoint, host) {
        this.endpoint = endpoint;
        this.host = host;
        this.totalRequestCount = 0;
        this.totalSuccesfulRequestCount = 0;
        this.totalFailedRequestCount = [];
        this.retryCount = [];
        this.exceptionCount = [];
        this.throttleCount = [];
        this.intervalRequestExecutionTime = 0;
        this.lastIntervalRequestExecutionTime = 0;
        this.lastTime = +new Date;
        this.lastRequestCount = 0;
    }
    return NetworkStatsbeat;
}());
exports.NetworkStatsbeat = NetworkStatsbeat;
//# sourceMappingURL=NetworkStatsbeat.js.map