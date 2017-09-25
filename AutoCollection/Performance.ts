import http = require("http");
import os = require("os");

import TelemetryClient = require("../Library/TelemetryClient");
import Contracts = require("../Declarations/Contracts");
import Logging = require("../Library/Logging");

class AutoCollectPerformance {

    public static INSTANCE: AutoCollectPerformance;

    private static _totalRequestCount: number = 0;
    private static _totalFailedRequestCount: number = 0;
    private static _lastRequestExecutionTime: number = 0;

    private _client: TelemetryClient;
    private _handle: NodeJS.Timer;
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _lastCpus: { model: string; speed: number; times: { user: number; nice: number; sys: number; idle: number; irq: number; }; }[];
    private _lastRequests: { totalRequestCount: number; totalFailedRequestCount: number; time: number; };

    constructor(client: TelemetryClient) {
        if (!!AutoCollectPerformance.INSTANCE) {
            throw new Error("Performance tracking should be configured from the applicationInsights object");
        }

        AutoCollectPerformance.INSTANCE = this;
        this._isInitialized = false;
        this._client = client;
    }

    public enable(isEnabled: boolean) {
        this._isEnabled = isEnabled;
        if (this._isEnabled && !this._isInitialized) {
            this._isInitialized = true;
        }

        if (isEnabled) {
            if (!this._handle) {
                this._lastCpus = os.cpus();
                this._lastRequests = {
                    totalRequestCount: AutoCollectPerformance._totalRequestCount,
                    totalFailedRequestCount: AutoCollectPerformance._totalFailedRequestCount,
                    time: +new Date
                };

                this._handle = setInterval(() => this.trackPerformance(), 60000);
                this._handle.unref(); // Allow the app to terminate even while this loop is going on
            }
        } else {
            if (this._handle) {
                clearInterval(this._handle);
                this._handle = undefined;
            }
        }
    }

    public static countRequest(request: http.ServerRequest, response: http.ServerResponse) {
        if (!AutoCollectPerformance.isEnabled()) {
            return;
        }

        var start = +new Date;
        if (!request || !response) {
            Logging.warn("AutoCollectPerformance.countRequest was called with invalid parameters: ", !!request, !!response);
            return;
        }

        // response listeners
        if (typeof response.once === "function") {
            response.once("finish", () => {
                var end = +new Date;
                this._lastRequestExecutionTime = end - start;
                AutoCollectPerformance._totalRequestCount++;
                if (response.statusCode >= 400) {
                    AutoCollectPerformance._totalFailedRequestCount++;
                }
            });
        }
    }

    public isInitialized() {
        return this._isInitialized;
    }

    public static isEnabled() {
        return AutoCollectPerformance.INSTANCE && AutoCollectPerformance.INSTANCE._isEnabled;
    }

    public trackPerformance() {
        this._trackCpu();
        this._trackMemory();
        this._trackNetwork();
    }

    private _trackCpu() {
        // this reports total ms spent in each category since the OS was booted, to calculate percent it is necessary
        // to find the delta since the last measurement
        var cpus = os.cpus();
        if (cpus && cpus.length && this._lastCpus && cpus.length === this._lastCpus.length) {
            var totalUser = 0;
            var totalSys = 0;
            var totalNice = 0;
            var totalIdle = 0;
            var totalIrq = 0;
            for (var i = 0; !!cpus && i < cpus.length; i++) {
                var cpu = cpus[i];
                var lastCpu = this._lastCpus[i];

                var name = "% cpu(" + i + ") ";
                var model = cpu.model;
                var speed = cpu.speed;
                var times = cpu.times;
                var lastTimes = lastCpu.times;

                // user cpu time (or) % CPU time spent in user space
                var user = (times.user - lastTimes.user) || 0;
                totalUser += user;

                // system cpu time (or) % CPU time spent in kernel space
                var sys = (times.sys - lastTimes.sys) || 0;
                totalSys += sys;

                // user nice cpu time (or) % CPU time spent on low priority processes
                var nice = (times.nice - lastTimes.nice) || 0;
                totalNice += nice;

                // idle cpu time (or) % CPU time spent idle
                var idle = (times.idle - lastTimes.idle) || 0;
                totalIdle += idle;

                // irq (or) % CPU time spent servicing/handling hardware interrupts
                var irq = (times.irq - lastTimes.irq) || 0;
                totalIrq += irq;
            }

            var combinedTotal = (totalUser + totalSys + totalNice + totalIdle + totalIrq) || 1;

            this._client.trackMetric({name: "\\Processor(_Total)\\% Processor Time", value: ((combinedTotal - totalIdle) / combinedTotal) * 100});
            this._client.trackMetric({name: "\\Process(??APP_WIN32_PROC??)\\% Processor Time", value: (totalUser / combinedTotal) * 100});
        }

        this._lastCpus = cpus;
    }

    private _trackMemory() {
        var totalMem = os.totalmem();
        var freeMem = os.freemem();
        var usedMem = totalMem - freeMem;
        var percentUsedMem = usedMem / (totalMem || 1);
        var percentAvailableMem = freeMem / (totalMem || 1);
        this._client.trackMetric({name:"\\Process(??APP_WIN32_PROC??)\\Private Bytes", value: usedMem});
        this._client.trackMetric({name: "\\Memory\\Available Bytes", value: freeMem});
    }

    private _trackNetwork() {
        // track total request counters
        var lastRequests = this._lastRequests;
        var requests = {
            totalRequestCount: AutoCollectPerformance._totalRequestCount,
            totalFailedRequestCount: AutoCollectPerformance._totalFailedRequestCount,
            time: +new Date
        };

        var intervalRequests = (requests.totalRequestCount - lastRequests.totalRequestCount) || 0;
        var intervalFailedRequests = (requests.totalFailedRequestCount - lastRequests.totalFailedRequestCount) || 0;
        var elapsedMs = requests.time - lastRequests.time;
        var elapsedSeconds = elapsedMs / 1000;

        if (elapsedMs > 0) {
            var requestsPerSec = intervalRequests / elapsedSeconds;
            var failedRequestsPerSec = intervalFailedRequests / elapsedSeconds;

            this._client.trackMetric({ name: "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Requests/Sec", value: requestsPerSec });
            this._client.trackMetric({ name: "\\ASP.NET Applications(??APP_W3SVC_PROC??)\\Request Execution Time", value: AutoCollectPerformance._lastRequestExecutionTime });
        }

        this._lastRequests = requests;
    }

    public dispose() {
        AutoCollectPerformance.INSTANCE = null;
        this.enable(false);
        this._isInitialized = false;
    }
}

export = AutoCollectPerformance;
