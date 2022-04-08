import * as  os from "os";

import { MetricHandler } from "../Library/Handlers/MetricHandler";
import * as  Constants from "../Declarations/Constants";

export class AutoCollectPerformance {

    private _totalRequestCount: number = 0;
    private _totalFailedRequestCount: number = 0;
    private _totalDependencyCount: number = 0;
    private _totalFailedDependencyCount: number = 0;
    private _totalExceptionCount: number = 0;
    private _intervalDependencyExecutionTime: number = 0;
    private _intervalRequestExecutionTime: number = 0;
    private _lastIntervalRequestExecutionTime: number = 0; // the sum of durations which took place during from app start until last interval
    private _lastIntervalDependencyExecutionTime: number = 0;
    private _enableLiveMetricsCounters: boolean;
    private _collectionInterval: number;
    private _handler: MetricHandler;
    private _handle: NodeJS.Timer;
    private _isEnabled: boolean;
    private _lastAppCpuUsage: { user: number, system: number };
    private _lastHrtime: number[];
    private _lastCpus: { model: string; speed: number; times: { user: number; nice: number; sys: number; idle: number; irq: number; }; }[];
    private _lastDependencies: { totalDependencyCount: number; totalFailedDependencyCount: number; time: number; };
    private _lastRequests: { totalRequestCount: number; totalFailedRequestCount: number; time: number; };
    private _lastExceptions: { totalExceptionCount: number, time: number };

    /**
     * @param enableLiveMetricsCounters - enable sending additional live metrics information (dependency metrics, exception metrics, committed memory)
     */
    constructor(handler: MetricHandler, collectionInterval = 60000, enableLiveMetricsCounters = false) {
        this._lastRequests = { totalRequestCount: 0, totalFailedRequestCount: 0, time: 0 };
        this._lastDependencies = { totalDependencyCount: 0, totalFailedDependencyCount: 0, time: 0 };
        this._lastExceptions = { totalExceptionCount: 0, time: 0 };
        this._handler = handler;
        this._collectionInterval = collectionInterval;
        this._enableLiveMetricsCounters = enableLiveMetricsCounters;
    }

    public enable(isEnabled: boolean, collectionInterval?: number) {
        this._isEnabled = isEnabled;
        if (isEnabled) {
            if (!this._handle) {
                this._lastCpus = os.cpus();
                this._lastRequests = {
                    totalRequestCount: this._totalRequestCount,
                    totalFailedRequestCount: this._totalFailedRequestCount,
                    time: +new Date
                };
                this._lastDependencies = {
                    totalDependencyCount: this._totalDependencyCount,
                    totalFailedDependencyCount: this._totalFailedDependencyCount,
                    time: +new Date
                };
                this._lastExceptions = {
                    totalExceptionCount: this._totalExceptionCount,
                    time: +new Date
                };

                if (typeof (process as any).cpuUsage === "function") {
                    this._lastAppCpuUsage = (process as any).cpuUsage();
                }
                this._lastHrtime = process.hrtime();
                this._collectionInterval = collectionInterval || this._collectionInterval;
                this._handle = setInterval(() => this._trackPerformance(), this._collectionInterval);
                this._handle.unref(); // Allow the app to terminate even while this loop is going on
            }
        } else {
            if (this._handle) {
                clearInterval(this._handle);
                this._handle = undefined;
            }
        }
    }

    public countRequest(duration: number | string, success: boolean) {
        let durationMs: number;
        if (!this._isEnabled) {
            return;
        }

        if (typeof duration === "string") {
            // dependency duration is passed in as "00:00:00.123" by autocollectors
            durationMs = +new Date("1970-01-01T" + duration + "Z"); // convert to num ms, returns NaN if wrong
        } else if (typeof duration === "number") {
            durationMs = duration;
        } else {
            return;
        }

        this._intervalRequestExecutionTime += durationMs;
        if (success === false) {
            this._totalFailedRequestCount++;
        }
        this._totalRequestCount++;
    }

    public countException() {
        this._totalExceptionCount++;
    }

    public countDependency(duration: number | string, success: boolean) {
        let durationMs: number;
        if (!this._isEnabled) {
            return;
        }

        if (typeof duration === "string") {
            // dependency duration is passed in as "00:00:00.123" by autocollectors
            durationMs = +new Date("1970-01-01T" + duration + "Z"); // convert to num ms, returns NaN if wrong
        } else if (typeof duration === "number") {
            durationMs = duration;
        } else {
            return;
        }

        this._intervalDependencyExecutionTime += durationMs;
        if (success === false) {
            this._totalFailedDependencyCount++;
        }
        this._totalDependencyCount++;
    }

    private _trackPerformance() {
        this._trackCpu();
        this._trackMemory();
        this._trackNetwork();
        this._trackDependencyRate();
        this._trackExceptionRate();
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

            // Calculate % of total cpu time (user + system) this App Process used (Only supported by node v6.1.0+)
            let appCpuPercent: number = undefined;
            if (typeof (process as any).cpuUsage === "function") {
                const appCpuUsage = (process as any).cpuUsage();
                const hrtime = process.hrtime();

                const totalApp = ((appCpuUsage.user - this._lastAppCpuUsage.user) + (appCpuUsage.system - this._lastAppCpuUsage.system)) || 0;

                if (typeof this._lastHrtime !== "undefined" && this._lastHrtime.length === 2) {
                    const elapsedTime = ((hrtime[0] - this._lastHrtime[0]) * 1e6 + (hrtime[1] - this._lastHrtime[1]) / 1e3) || 0; // convert to microseconds

                    appCpuPercent = 100 * totalApp / (elapsedTime * cpus.length);
                }

                // Set previous
                this._lastAppCpuUsage = appCpuUsage;
                this._lastHrtime = hrtime;
            }

            var combinedTotal = (totalUser + totalSys + totalNice + totalIdle + totalIrq) || 1;

            this._handler.trackMetric({ metrics: [{ name: Constants.PerformanceCounter.PROCESSOR_TIME, value: ((combinedTotal - totalIdle) / combinedTotal) * 100 }] });
            this._handler.trackMetric({ metrics: [{ name: Constants.PerformanceCounter.PROCESS_TIME, value: appCpuPercent || ((totalUser / combinedTotal) * 100) }] });
        }

        this._lastCpus = cpus;
    }

    private _trackMemory() {
        var freeMem = os.freemem();
        var usedMem = process.memoryUsage().rss;
        var committedMemory = os.totalmem() - freeMem;
        this._handler.trackMetric({ metrics: [{ name: Constants.PerformanceCounter.PRIVATE_BYTES, value: usedMem }] });
        this._handler.trackMetric({ metrics: [{ name: Constants.PerformanceCounter.AVAILABLE_BYTES, value: freeMem }] });
        // Only supported by quickpulse service
        if (this._enableLiveMetricsCounters) {
            this._handler.trackMetric({ metrics: [{ name: Constants.QuickPulseCounter.COMMITTED_BYTES, value: committedMemory }] });
        }
    }

    private _trackNetwork() {
        // track total request counters
        var lastRequests = this._lastRequests;
        var requests = {
            totalRequestCount: this._totalRequestCount,
            totalFailedRequestCount: this._totalFailedRequestCount,
            time: +new Date
        };
        var intervalRequests = (requests.totalRequestCount - lastRequests.totalRequestCount) || 0;
        var intervalFailedRequests = (requests.totalFailedRequestCount - lastRequests.totalFailedRequestCount) || 0;
        var elapsedMs = requests.time - lastRequests.time;
        var elapsedSeconds = elapsedMs / 1000;
        var averageRequestExecutionTime = ((this._intervalRequestExecutionTime - this._lastIntervalRequestExecutionTime) / intervalRequests) || 0; // default to 0 in case no requests in this interval
        this._lastIntervalRequestExecutionTime = this._intervalRequestExecutionTime // reset

        if (elapsedMs > 0) {
            var requestsPerSec = intervalRequests / elapsedSeconds;
            var failedRequestsPerSec = intervalFailedRequests / elapsedSeconds;

            this._handler.trackMetric({ metrics: [{ name: Constants.PerformanceCounter.REQUEST_RATE, value: requestsPerSec }] });

            // Only send duration to live metrics if it has been updated!
            if (!this._enableLiveMetricsCounters || intervalRequests > 0) {
                this._handler.trackMetric({ metrics: [{ name: Constants.PerformanceCounter.REQUEST_DURATION, value: averageRequestExecutionTime }] });
            }

            // Only supported by quickpulse service
            if (this._enableLiveMetricsCounters) {
                this._handler.trackMetric({ metrics: [{ name: Constants.QuickPulseCounter.REQUEST_FAILURE_RATE, value: failedRequestsPerSec }] });
            }
        }

        this._lastRequests = requests;
    }

    // Counter is accumulated externally. Report the rate to client here
    // Note: This is currently only used with QuickPulse client
    private _trackDependencyRate() {
        if (this._enableLiveMetricsCounters) {
            var lastDependencies = this._lastDependencies;
            var dependencies = {
                totalDependencyCount: this._totalDependencyCount,
                totalFailedDependencyCount: this._totalFailedDependencyCount,
                time: +new Date
            };

            var intervalDependencies = (dependencies.totalDependencyCount - lastDependencies.totalDependencyCount) || 0;
            var intervalFailedDependencies = (dependencies.totalFailedDependencyCount - lastDependencies.totalFailedDependencyCount) || 0;
            var elapsedMs = dependencies.time - lastDependencies.time;
            var elapsedSeconds = elapsedMs / 1000;
            var averageDependencyExecutionTime = ((this._intervalDependencyExecutionTime - this._lastIntervalDependencyExecutionTime) / intervalDependencies) || 0;
            this._lastIntervalDependencyExecutionTime = this._intervalDependencyExecutionTime // reset

            if (elapsedMs > 0) {
                var dependenciesPerSec = intervalDependencies / elapsedSeconds;
                var failedDependenciesPerSec = intervalFailedDependencies / elapsedSeconds;

                this._handler.trackMetric({ metrics: [{ name: Constants.QuickPulseCounter.DEPENDENCY_RATE, value: dependenciesPerSec }] });
                this._handler.trackMetric({ metrics: [{ name: Constants.QuickPulseCounter.DEPENDENCY_FAILURE_RATE, value: failedDependenciesPerSec }] });

                // redundant check for livemetrics, but kept for consistency w/ requests
                // Only send duration to live metrics if it has been updated!
                if (!this._enableLiveMetricsCounters || intervalDependencies > 0) {
                    this._handler.trackMetric({ metrics: [{ name: Constants.QuickPulseCounter.DEPENDENCY_DURATION, value: averageDependencyExecutionTime }] });
                }
            }
            this._lastDependencies = dependencies;
        }
    }

    // Counter is accumulated externally. Report the rate to client here
    // Note: This is currently only used with QuickPulse client
    private _trackExceptionRate() {
        if (this._enableLiveMetricsCounters) {
            var lastExceptions = this._lastExceptions;
            var exceptions = {
                totalExceptionCount: this._totalExceptionCount,
                time: +new Date
            };

            var intervalExceptions = (exceptions.totalExceptionCount - lastExceptions.totalExceptionCount) || 0;
            var elapsedMs = exceptions.time - lastExceptions.time;
            var elapsedSeconds = elapsedMs / 1000;

            if (elapsedMs > 0) {
                var exceptionsPerSec = intervalExceptions / elapsedSeconds;
                this._handler.trackMetric({ metrics: [{ name: Constants.QuickPulseCounter.EXCEPTION_RATE, value: exceptionsPerSec }] });
            }
            this._lastExceptions = exceptions;
        }
    }
}
