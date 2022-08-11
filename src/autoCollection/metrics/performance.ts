// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as os from "os";
import { Meter, ObservableCallback, ObservableGauge, ObservableResult, ValueType } from "@opentelemetry/api-metrics";
import { QuickPulseCounter, PerformanceCounter } from "./types";
import { HttpMetricsInstrumentation } from "./httpMetricsInstrumentation";
import { Config } from "../../library";
import { MetricHandler } from "../../library/handlers";


export class AutoCollectPerformance {
    private _config: Config;
    private _metricHandler: MetricHandler;
    private _meter: Meter;
    private _enableLiveMetricsCounters: boolean;
    private _httpMetrics: HttpMetricsInstrumentation;
    // Perf counters
    private _memoryPrivateBytesGauge: ObservableGauge;
    private _memoryPrivateBytesGaugeCallback: ObservableCallback;
    private _memoryAvailableBytesGauge: ObservableGauge;
    private _memoryAvailableBytesGaugeCallback: ObservableCallback;
    private _processorTimeGauge: ObservableGauge;
    private _processorTimeGaugeCallback: ObservableCallback;
    private _processTimeGauge: ObservableGauge;
    private _processTimeGaugeCallback: ObservableCallback;
    private _requestRateGauge: ObservableGauge;
    private _requestRateGaugeCallback: ObservableCallback;
    private _requestDurationGauge: ObservableGauge;
    private _requestDurationGaugeCallback: ObservableCallback;
    // Live Metrics Perf counters
    private _memoryCommittedBytesGauge: ObservableGauge;
    private _memoryCommittedBytesGaugeCallback: ObservableCallback;
    private _requestFailureRateGauge: ObservableGauge;
    private _requestFailureRateGaugeCallback: ObservableCallback;
    private _dependencyFailureRateGauge: ObservableGauge;
    private _dependencyFailureRateGaugeCallback: ObservableCallback;
    private _dependencyRateGauge: ObservableGauge;
    private _dependencyRateGaugeCallback: ObservableCallback;
    private _dependencyDurationGauge: ObservableGauge;
    private _dependencyDurationGaugeCallback: ObservableCallback;
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

    constructor(config: Config, metricHandler: MetricHandler) {
        this._config = config;
        this._metricHandler = metricHandler;
        this._meter = this._metricHandler.getMeter();
        this._enableLiveMetricsCounters = this._config.enableSendLiveMetrics;
        this._lastRequestRate = { count: 0, time: 0, executionInterval: 0 };
        this._lastFailureRequestRate = { count: 0, time: 0, executionInterval: 0 };
        this._lastRequestDuration = { count: 0, time: 0, executionInterval: 0 };
        this._lastDependencyRate = { count: 0, time: 0, executionInterval: 0 };
        this._lastFailureDependencyRate = { count: 0, time: 0, executionInterval: 0 };
        this._lastDependencyDuration = { count: 0, time: 0, executionInterval: 0 };
        this._httpMetrics = metricHandler.getHttpMetricsInstrumentation();

        // perf counters
        this._memoryPrivateBytesGauge = this._meter.createObservableGauge(PerformanceCounter.PRIVATE_BYTES, { description: "Amount of memory process has used in bytes", valueType: ValueType.INT });
        this._memoryAvailableBytesGauge = this._meter.createObservableGauge(PerformanceCounter.AVAILABLE_BYTES, { description: "Amount of available memory in bytes", valueType: ValueType.INT });
        this._processorTimeGauge = this._meter.createObservableGauge(PerformanceCounter.PROCESSOR_TIME, { description: "Processor time as a percentage", valueType: ValueType.DOUBLE });
        this._processTimeGauge = this._meter.createObservableGauge(PerformanceCounter.PROCESS_TIME, { description: "Process CPU usage as a percentage", valueType: ValueType.DOUBLE });
        this._requestRateGauge = this._meter.createObservableGauge(PerformanceCounter.REQUEST_RATE, { description: "Incoming Requests Average Execution Time", valueType: ValueType.DOUBLE });
        this._requestDurationGauge = this._meter.createObservableGauge(PerformanceCounter.REQUEST_DURATION, { description: "Incoming Requests Average Execution Time", valueType: ValueType.DOUBLE });
        // Live metrics perf counters
        this._memoryCommittedBytesGauge = this._meter.createObservableGauge(QuickPulseCounter.COMMITTED_BYTES, { description: "Amount of committed memory in bytes", valueType: ValueType.INT });
        this._dependencyRateGauge = this._meter.createObservableGauge(QuickPulseCounter.DEPENDENCY_RATE, { description: "Incoming Requests Rate", valueType: ValueType.DOUBLE });
        this._dependencyFailureRateGauge = this._meter.createObservableGauge(QuickPulseCounter.DEPENDENCY_FAILURE_RATE, { description: "Failed Outgoing Requests per second", valueType: ValueType.DOUBLE });
        this._dependencyDurationGauge = this._meter.createObservableGauge(QuickPulseCounter.DEPENDENCY_DURATION, { description: "Average Outgoing Requests duration", valueType: ValueType.DOUBLE });
        this._requestFailureRateGauge = this._meter.createObservableGauge(QuickPulseCounter.REQUEST_FAILURE_RATE, { description: "Incoming Requests Failed Rate", valueType: ValueType.DOUBLE })
        this._exceptionRateGauge = this._meter.createObservableGauge(QuickPulseCounter.EXCEPTION_RATE, { description: "Exceptions per second", valueType: ValueType.DOUBLE });

        this._memoryPrivateBytesGaugeCallback = this._getPrivateMemory.bind(this);
        this._memoryAvailableBytesGaugeCallback = this._getAvailableMemory.bind(this);
        this._processorTimeGaugeCallback = this._getProcessTime.bind(this);
        this._processTimeGaugeCallback = this._getProcessorTime.bind(this);
        this._requestRateGaugeCallback = this._getRequestRate.bind(this);
        this._requestDurationGaugeCallback = this._getRequestDuration.bind(this);
        this._memoryCommittedBytesGaugeCallback = this._getCommittedMemory.bind(this);
        this._requestFailureRateGaugeCallback = this._getFailureRequestRate.bind(this);
        this._dependencyFailureRateGaugeCallback = this._getFailureDependencyRate.bind(this);
        this._dependencyRateGaugeCallback = this._getDependencyRate.bind(this);
        this._dependencyDurationGaugeCallback = this._getDependencyDuration.bind(this);
    }

    public enable(isEnabled: boolean) {
        if (isEnabled) {
            this._lastCpus = os.cpus();

            this._lastRequestRate = {
                count: this._httpMetrics.totalRequestCount,
                time: +new Date(),
                executionInterval: this._httpMetrics.intervalRequestExecutionTime
            };
            this._lastFailureRequestRate = {
                count: this._httpMetrics.totalFailedRequestCount,
                time: +new Date(),
                executionInterval: this._httpMetrics.intervalRequestExecutionTime
            };
            this._lastRequestDuration = {
                count: this._httpMetrics.totalRequestCount,
                time: +new Date(),
                executionInterval: this._httpMetrics.intervalRequestExecutionTime
            };
            this._lastDependencyRate = {
                count: this._httpMetrics.totalDependencyCount,
                time: +new Date(),
                executionInterval: this._httpMetrics.intervalDependencyExecutionTime
            };
            this._lastFailureDependencyRate = {
                count: this._httpMetrics.totalFailedRequestCount,
                time: +new Date(),
                executionInterval: this._httpMetrics.intervalDependencyExecutionTime
            };
            this._lastDependencyDuration = {
                count: this._httpMetrics.totalDependencyCount,
                time: +new Date(),
                executionInterval: this._httpMetrics.intervalDependencyExecutionTime
            };
            this._lastAppCpuUsage = (process as any).cpuUsage();
            this._lastHrtime = process.hrtime();

            this._memoryPrivateBytesGauge.addCallback(this._memoryPrivateBytesGaugeCallback);
            this._memoryAvailableBytesGauge.addCallback(this._memoryAvailableBytesGaugeCallback);
            this._processTimeGauge.addCallback(this._processTimeGaugeCallback);
            this._processorTimeGauge.addCallback(this._processorTimeGaugeCallback);
            this._requestDurationGauge.addCallback(this._requestDurationGaugeCallback);
            this._requestRateGauge.addCallback(this._requestRateGaugeCallback);

            if (this._enableLiveMetricsCounters) {
                this._memoryCommittedBytesGauge.addCallback(this._memoryCommittedBytesGaugeCallback);
                this._requestFailureRateGauge.addCallback(this._requestFailureRateGaugeCallback);
                this._dependencyDurationGauge.addCallback(this._dependencyDurationGaugeCallback);
                this._dependencyFailureRateGauge.addCallback(this._dependencyFailureRateGaugeCallback);
                this._dependencyRateGauge.addCallback(this._dependencyRateGaugeCallback);
            }
        }
        else {
            this._memoryPrivateBytesGauge.removeCallback(this._memoryPrivateBytesGaugeCallback);
            this._memoryAvailableBytesGauge.removeCallback(this._memoryAvailableBytesGaugeCallback);
            this._processTimeGauge.removeCallback(this._processTimeGaugeCallback);
            this._processorTimeGauge.removeCallback(this._processorTimeGaugeCallback);
            this._requestDurationGauge.removeCallback(this._requestDurationGaugeCallback);
            this._requestRateGauge.removeCallback(this._requestRateGaugeCallback);

            if (this._enableLiveMetricsCounters) {
                this._memoryCommittedBytesGauge.removeCallback(this._memoryCommittedBytesGaugeCallback);
                this._requestFailureRateGauge.removeCallback(this._requestFailureRateGaugeCallback);
                this._dependencyDurationGauge.removeCallback(this._dependencyDurationGaugeCallback);
                this._dependencyFailureRateGauge.removeCallback(this._dependencyFailureRateGaugeCallback);
                this._dependencyRateGauge.removeCallback(this._dependencyRateGaugeCallback);
            }
        }
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
        let currentTime = + new Date();
        var intervalRequests = this._httpMetrics.totalRequestCount - this._lastRequestDuration.count || 0;
        var elapsedMs = currentTime - this._lastRequestDuration.time;
        if (elapsedMs > 0) {
            var averageRequestExecutionTime =
                (this._httpMetrics.intervalRequestExecutionTime - this._lastRequestDuration.executionInterval) /
                intervalRequests || 0; // default to 0 in case no requests in this interval
            this._lastRequestDuration.executionInterval = this._httpMetrics.intervalRequestExecutionTime; // reset
            observableResult.observe(averageRequestExecutionTime);
        }
        this._lastRequestDuration = {
            count: this._httpMetrics.totalRequestCount,
            time: currentTime,
            executionInterval: this._lastRequestDuration.executionInterval
        };
    }

    private _getRequestRate(observableResult: ObservableResult) {
        let currentTime = + new Date();
        var intervalRequests = this._httpMetrics.totalRequestCount - this._lastRequestRate.count || 0;
        var elapsedMs = currentTime - this._lastRequestRate.time;
        if (elapsedMs > 0) {
            var elapsedSeconds = elapsedMs / 1000;
            var requestsPerSec = intervalRequests / elapsedSeconds;
            observableResult.observe(requestsPerSec);
        }
        this._lastRequestRate = {
            count: this._httpMetrics.totalRequestCount,
            time: currentTime,
            executionInterval: this._lastRequestRate.executionInterval
        };
    }

    private _getFailureRequestRate(observableResult: ObservableResult) {
        let currentTime = + new Date();
        var intervalRequests = this._httpMetrics.totalFailedDependencyCount - this._lastFailureRequestRate.count || 0;
        var elapsedMs = currentTime - this._lastFailureRequestRate.time;
        if (elapsedMs > 0) {
            var elapsedSeconds = elapsedMs / 1000;
            var requestsPerSec = intervalRequests / elapsedSeconds;
            observableResult.observe(requestsPerSec);
        }
        this._lastFailureRequestRate = {
            count: this._httpMetrics.totalFailedDependencyCount,
            time: currentTime,
            executionInterval: this._lastFailureRequestRate.executionInterval
        };
    }

    private _getDependencyDuration(observableResult: ObservableResult) {
        let currentTime = + new Date();
        var intervalDependencys = this._httpMetrics.totalDependencyCount - this._lastDependencyDuration.count || 0;
        var elapsedMs = currentTime - this._lastDependencyDuration.time;
        if (elapsedMs > 0) {
            var averageDependencyExecutionTime =
                (this._httpMetrics.intervalDependencyExecutionTime - this._lastDependencyDuration.executionInterval) /
                intervalDependencys || 0; // default to 0 in case no Dependencys in this interval
            this._lastDependencyDuration.executionInterval = this._httpMetrics.intervalDependencyExecutionTime; // reset
            observableResult.observe(averageDependencyExecutionTime);
        }
        this._lastDependencyDuration = {
            count: this._httpMetrics.totalDependencyCount,
            time: currentTime,
            executionInterval: this._lastDependencyDuration.executionInterval
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
        this._lastFailureDependencyRate = {
            count: this._httpMetrics.totalFailedDependencyCount,
            time: currentTime,
            executionInterval: last.executionInterval
        };
    }
}
