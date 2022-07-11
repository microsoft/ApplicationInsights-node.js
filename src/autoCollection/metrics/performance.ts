// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as os from "os";
import { Meter, ObservableGauge, ObservableResult, ValueType } from "@opentelemetry/api-metrics";
import { QuickPulseCounter, PerformanceCounter } from "../../declarations/constants";
import { HttpMetricsInstrumentation } from "./httpMetricsInstrumentation";


export class AutoCollectPerformance {

    private _meter: Meter;
    private _enableLiveMetricsCounters: boolean;
    private _httpMetrics: HttpMetricsInstrumentation
    private _isEnabled: boolean;
    // Perf counters
    private _memoryPrivateBytesGauge: ObservableGauge;
    private _memoryAvailableBytesGauge: ObservableGauge;
    private _processorTimeGauge: ObservableGauge;
    private _processTimeGauge: ObservableGauge;
    private _requestRateGauge: ObservableGauge;
    private _requestDurationGauge: ObservableGauge;
    // Live Metrics Perf counters
    private _memoryCommittedBytesGauge: ObservableGauge;
    private _requestFailureRateGauge: ObservableGauge;
    private _dependencyFailureRateGauge: ObservableGauge;
    private _dependencyRateGauge: ObservableGauge;
    private _dependencyDurationGauge: ObservableGauge;
    private _exceptionRateGauge: ObservableGauge; // TODO: Not implemented yet

    private _lastAppCpuUsage: { user: number; system: number };
    private _lastHrtime: number[];
    private _lastCpus: {
        model: string;
        speed: number;
        times: { user: number; nice: number; sys: number; idle: number; irq: number };
    }[];
    private _lastRequestRate: { count: number; time: number; executionInterval: number; };
    private _lastFailureRequestRate: { count: number; time: number; executionInterval: number; };
    private _lastRequestDuration: { count: number; time: number; executionInterval: number; };
    private _lastDependencyRate: { count: number; time: number; executionInterval: number; };
    private _lastFailureDependencyRate: { count: number; time: number; executionInterval: number; };
    private _lastDependencyDuration: { count: number; time: number; executionInterval: number; };

    /**
     * @param enableLiveMetricsCounters - enable sending additional live metrics information (dependency metrics, exception metrics, committed memory)
     */
    constructor(meter: Meter, enableLiveMetricsCounters = false) {
        this._meter = meter;
        this._enableLiveMetricsCounters = enableLiveMetricsCounters;
        this._lastRequestRate = { count: 0, time: 0, executionInterval: 0 };
        this._lastFailureRequestRate = { count: 0, time: 0, executionInterval: 0 };
        this._lastRequestDuration = { count: 0, time: 0, executionInterval: 0 };
        this._lastDependencyRate = { count: 0, time: 0, executionInterval: 0 };
        this._lastFailureDependencyRate = { count: 0, time: 0, executionInterval: 0 };
        this._lastDependencyDuration = { count: 0, time: 0, executionInterval: 0 };
        this._httpMetrics = HttpMetricsInstrumentation.getInstance();

        // perf counters
        this._memoryPrivateBytesGauge = this._meter.createObservableGauge(PerformanceCounter.PRIVATE_BYTES, { description: "Amount of memory process has used in bytes", valueType: ValueType.INT });
        this._memoryAvailableBytesGauge = this._meter.createObservableGauge(PerformanceCounter.AVAILABLE_BYTES, { description: "Amount of available memory in bytes", valueType: ValueType.INT });
        this._processorTimeGauge = this._meter.createObservableGauge(PerformanceCounter.PROCESSOR_TIME, { description: "Processor time as a percentage", valueType: ValueType.DOUBLE });
        this._processTimeGauge = this._meter.createObservableGauge(PerformanceCounter.PROCESS_TIME, { description: "Process CPU usage as a percentage", valueType: ValueType.DOUBLE });
        this._requestRateGauge = this._meter.createObservableGauge(PerformanceCounter.REQUEST_RATE, { description: "Incoming Requests Average Execution Time", valueType: ValueType.DOUBLE });
        this._requestDurationGauge = this._meter.createObservableGauge(PerformanceCounter.REQUEST_DURATION, { description: "Incoming Requests Average Execution Time", valueType: ValueType.DOUBLE });
        // Live metrics perf counters
        this._memoryCommittedBytesGauge = this._meter.createObservableGauge(QuickPulseCounter.COMMITTED_BYTES, { description: "Amount of committed memory in bytes", valueType: ValueType.INT });
        this._exceptionRateGauge = this._meter.createObservableGauge(QuickPulseCounter.EXCEPTION_RATE, { description: "Exceptions per second", valueType: ValueType.DOUBLE });
        this._dependencyRateGauge = this._meter.createObservableGauge(QuickPulseCounter.DEPENDENCY_RATE, { description: "Incoming Requests Rate", valueType: ValueType.DOUBLE });
        this._dependencyFailureRateGauge = this._meter.createObservableGauge(QuickPulseCounter.DEPENDENCY_FAILURE_RATE, { description: "Failed Outgoing Requests per second", valueType: ValueType.DOUBLE });
        this._dependencyDurationGauge = this._meter.createObservableGauge(QuickPulseCounter.DEPENDENCY_DURATION, { description: "Average Outgoing Requests duration", valueType: ValueType.DOUBLE });
        this._requestFailureRateGauge = this._meter.createObservableGauge(QuickPulseCounter.REQUEST_FAILURE_RATE, { description: "Incoming Requests Failed Rate", valueType: ValueType.DOUBLE })

        this._memoryPrivateBytesGauge.addCallback(this._getPrivateMemory);
        this._memoryAvailableBytesGauge.addCallback(this._getAvailableMemory);
        this._processTimeGauge.addCallback(this._getProcessTime);
        this._processorTimeGauge.addCallback(this._getProcessorTime);
        this._requestDurationGauge.addCallback(this._getRequestDuration);
        this._requestRateGauge.addCallback(this._getRequestRate);

        if (this._enableLiveMetricsCounters) {
            this._memoryCommittedBytesGauge.addCallback(this._getCommittedMemory);
            this._requestFailureRateGauge.addCallback(this._getFailureRequestRate);
            this._dependencyDurationGauge.addCallback(this._getDependencyDuration);
            this._dependencyFailureRateGauge.addCallback(this._getFailureDependencyRate);
            this._dependencyRateGauge.addCallback(this._getDependencyRate);
        }
    }

    public enable(isEnabled: boolean) {
        this._isEnabled = isEnabled;
        // TODO: Update view to choose which metrics to export?
        // TODO: Allow enable/disable functionality?
    }

    private _getPrivateMemory(observableResult: ObservableResult) {
        observableResult.observe(process.memoryUsage().rss);
    }

    private _getAvailableMemory(observableResult: ObservableResult) {
        observableResult.observe(os.freemem());
    }

    private _getCommittedMemory(observableResult: ObservableResult) {
        observableResult.observe(os.totalmem() - os.freemem());
    }

    private _getTotalCombinedCpu(cpus: os.CpuInfo[]) {
        var totalUser = 0;
        var totalSys = 0;
        var totalNice = 0;
        var totalIdle = 0;
        var totalIrq = 0;
        for (var i = 0; !!cpus && i < cpus.length; i++) {
            var cpu = cpus[i];
            var lastCpu = this._lastCpus[i];
            var times = cpu.times;
            var lastTimes = lastCpu.times;
            // user cpu time (or) % CPU time spent in user space
            var user = times.user - lastTimes.user || 0;
            totalUser += user;
            // system cpu time (or) % CPU time spent in kernel space
            var sys = times.sys - lastTimes.sys || 0;
            totalSys += sys;
            // user nice cpu time (or) % CPU time spent on low priority processes
            var nice = times.nice - lastTimes.nice || 0;
            totalNice += nice;
            // idle cpu time (or) % CPU time spent idle
            var idle = times.idle - lastTimes.idle || 0;
            totalIdle += idle;
            // irq (or) % CPU time spent servicing/handling hardware interrupts
            var irq = times.irq - lastTimes.irq || 0;
            totalIrq += irq;
        }
        var combinedTotal = totalUser + totalSys + totalNice + totalIdle + totalIrq || 1;
        return {
            combinedTotal: combinedTotal,
            totalUser: totalUser,
            totalIdle: totalIdle
        };
    }

    private _getProcessorTime(observableResult: ObservableResult) {
        // this reports total ms spent in each category since the OS was booted, to calculate percent it is necessary
        // to find the delta since the last measurement
        var cpus = os.cpus();
        if (cpus && cpus.length && this._lastCpus && cpus.length === this._lastCpus.length) {
            let cpuTotals = this._getTotalCombinedCpu(cpus);
            let value = ((cpuTotals.combinedTotal - cpuTotals.totalIdle) / cpuTotals.combinedTotal) * 100;
            observableResult.observe(value);
        }
        this._lastCpus = cpus;
    }

    private _getProcessTime(observableResult: ObservableResult) {
        // this reports total ms spent in each category since the OS was booted, to calculate percent it is necessary
        // to find the delta since the last measurement
        var cpus = os.cpus();
        if (cpus && cpus.length && this._lastCpus && cpus.length === this._lastCpus.length) {
            // Calculate % of total cpu time (user + system) this App Process used (Only supported by node v6.1.0+)
            let appCpuPercent: number | undefined = undefined;
            const appCpuUsage = (process as any).cpuUsage();
            const hrtime = process.hrtime();
            const totalApp =
                appCpuUsage.user -
                this._lastAppCpuUsage.user +
                (appCpuUsage.system - this._lastAppCpuUsage.system) || 0;

            if (typeof this._lastHrtime !== "undefined" && this._lastHrtime.length === 2) {
                const elapsedTime =
                    (hrtime[0] - this._lastHrtime[0]) * 1e6 +
                    (hrtime[1] - this._lastHrtime[1]) / 1e3 || 0; // convert to microseconds

                appCpuPercent = (100 * totalApp) / (elapsedTime * cpus.length);
            }
            // Set previous
            this._lastAppCpuUsage = appCpuUsage;
            this._lastHrtime = hrtime;
            let cpuTotals = this._getTotalCombinedCpu(cpus);
            let value = appCpuPercent || (cpuTotals.totalUser / cpuTotals.combinedTotal) * 100;
            observableResult.observe(value);
        }
        this._lastCpus = cpus;
    }

    private _getRequestDuration(observableResult: ObservableResult) {
        var last = this._lastRequestDuration;
        let currentTime = + new Date();
        var intervalRequests = this._httpMetrics.totalRequestCount - last.count || 0;
        var elapsedMs = currentTime - last.time;
        if (elapsedMs > 0) {
            var averageRequestExecutionTime =
                (this._httpMetrics.intervalRequestExecutionTime - last.executionInterval) /
                intervalRequests || 0; // default to 0 in case no requests in this interval
            last.executionInterval = this._httpMetrics.intervalRequestExecutionTime; // reset
            observableResult.observe(averageRequestExecutionTime);
        }
        this._lastRequestRate = {
            count: this._httpMetrics.totalRequestCount,
            time: currentTime,
            executionInterval: last.executionInterval
        };
    }

    private _getRequestRate(observableResult: ObservableResult) {
        var last = this._lastRequestRate;
        let currentTime = + new Date();
        var intervalRequests = this._httpMetrics.totalRequestCount - last.count || 0;
        var elapsedMs = currentTime - last.time;
        if (elapsedMs > 0) {
            var elapsedSeconds = elapsedMs / 1000;
            var requestsPerSec = intervalRequests / elapsedSeconds;
            observableResult.observe(requestsPerSec);
        }
        this._lastRequestRate = {
            count: this._httpMetrics.totalRequestCount,
            time: currentTime,
            executionInterval: last.executionInterval
        };
    }

    private _getFailureRequestRate(observableResult: ObservableResult) {
        var last = this._lastFailureRequestRate;
        let currentTime = + new Date();
        var intervalRequests = this._httpMetrics.totalFailedDependencyCount - last.count || 0;
        var elapsedMs = currentTime - last.time;
        if (elapsedMs > 0) {
            var elapsedSeconds = elapsedMs / 1000;
            var requestsPerSec = intervalRequests / elapsedSeconds;
            observableResult.observe(requestsPerSec);
        }
        this._lastRequestRate = {
            count: this._httpMetrics.totalFailedDependencyCount,
            time: currentTime,
            executionInterval: last.executionInterval
        };
    }

    private _getDependencyDuration(observableResult: ObservableResult) {
        var last = this._lastDependencyDuration;
        let currentTime = + new Date();
        var intervalDependencys = this._httpMetrics.totalDependencyCount - last.count || 0;
        var elapsedMs = currentTime - last.time;
        if (elapsedMs > 0) {
            var averageDependencyExecutionTime =
                (this._httpMetrics.intervalDependencyExecutionTime - last.executionInterval) /
                intervalDependencys || 0; // default to 0 in case no Dependencys in this interval
            last.executionInterval = this._httpMetrics.intervalDependencyExecutionTime; // reset
            observableResult.observe(averageDependencyExecutionTime);
        }
        this._lastDependencyRate = {
            count: this._httpMetrics.totalDependencyCount,
            time: currentTime,
            executionInterval: last.executionInterval
        };
    }

    private _getDependencyRate(observableResult: ObservableResult) {
        var last = this._lastDependencyRate;
        let currentTime = + new Date();
        var intervalDependencys = this._httpMetrics.totalDependencyCount - last.count || 0;
        var elapsedMs = currentTime - last.time;
        if (elapsedMs > 0) {
            var elapsedSeconds = elapsedMs / 1000;
            var DependencysPerSec = intervalDependencys / elapsedSeconds;
            observableResult.observe(DependencysPerSec);
        }
        this._lastDependencyRate = {
            count: this._httpMetrics.totalDependencyCount,
            time: currentTime,
            executionInterval: last.executionInterval
        };
    }

    private _getFailureDependencyRate(observableResult: ObservableResult) {
        var last = this._lastFailureDependencyRate;
        let currentTime = + new Date();
        var intervalDependencys = this._httpMetrics.totalFailedDependencyCount - last.count || 0;
        var elapsedMs = currentTime - last.time;
        if (elapsedMs > 0) {
            var elapsedSeconds = elapsedMs / 1000;
            var DependencysPerSec = intervalDependencys / elapsedSeconds;
            observableResult.observe(DependencysPerSec);
        }
        this._lastDependencyRate = {
            count: this._httpMetrics.totalFailedDependencyCount,
            time: currentTime,
            executionInterval: last.executionInterval
        };
    }
}
