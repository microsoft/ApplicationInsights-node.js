// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as os from "os";
import { Meter, ObservableCallback, ObservableGauge, ObservableResult, ValueType } from "@opentelemetry/api-metrics";
import { MetricName } from "../types";


export class ProcessMetrics {
    private _meter: Meter;
    private _memoryPrivateBytesGauge: ObservableGauge;
    private _memoryPrivateBytesGaugeCallback: ObservableCallback;
    private _memoryAvailableBytesGauge: ObservableGauge;
    private _memoryAvailableBytesGaugeCallback: ObservableCallback;
    private _processorTimeGauge: ObservableGauge;
    private _processorTimeGaugeCallback: ObservableCallback;
    private _processTimeGauge: ObservableGauge;
    private _processTimeGaugeCallback: ObservableCallback;
    private _memoryCommittedBytesGauge: ObservableGauge;
    private _memoryCommittedBytesGaugeCallback: ObservableCallback;


    private _lastAppCpuUsage: { user: number; system: number };
    private _lastHrtime: number[];
    private _lastCpus: {
        model: string;
        speed: number;
        times: { user: number; nice: number; sys: number; idle: number; irq: number };
    }[];

    constructor(meter: Meter) {
        this._meter = meter;
        this._memoryPrivateBytesGauge = this._meter.createObservableGauge(MetricName.PRIVATE_BYTES, { description: "Amount of memory process has used in bytes", valueType: ValueType.INT });
        this._memoryAvailableBytesGauge = this._meter.createObservableGauge(MetricName.AVAILABLE_BYTES, { description: "Amount of available memory in bytes", valueType: ValueType.INT });
        this._processorTimeGauge = this._meter.createObservableGauge(MetricName.PROCESSOR_TIME, { description: "Processor time as a percentage", valueType: ValueType.DOUBLE });
        this._processTimeGauge = this._meter.createObservableGauge(MetricName.PROCESS_TIME, { description: "Process CPU usage as a percentage", valueType: ValueType.DOUBLE });
        this._memoryCommittedBytesGauge = this._meter.createObservableGauge(MetricName.COMMITTED_BYTES, { description: "Amount of committed memory in bytes", valueType: ValueType.INT });
        this._memoryPrivateBytesGaugeCallback = this._getPrivateMemory.bind(this);
        this._memoryAvailableBytesGaugeCallback = this._getAvailableMemory.bind(this);
        this._processorTimeGaugeCallback = this._getProcessorTime.bind(this);
        this._processTimeGaugeCallback = this._getProcessTime.bind(this);
        this._memoryCommittedBytesGaugeCallback = this._getCommittedMemory.bind(this);
    }

    public enable(isEnabled: boolean) {
        if (isEnabled) {
            this._lastCpus = os.cpus();
            this._lastAppCpuUsage = (process as any).cpuUsage();
            this._lastHrtime = process.hrtime();
            this._memoryPrivateBytesGauge.addCallback(this._memoryPrivateBytesGaugeCallback);
            this._memoryAvailableBytesGauge.addCallback(this._memoryAvailableBytesGaugeCallback);
            this._processTimeGauge.addCallback(this._processTimeGaugeCallback);
            this._processorTimeGauge.addCallback(this._processorTimeGaugeCallback);
            this._memoryCommittedBytesGauge.addCallback(this._memoryCommittedBytesGaugeCallback);
        }
        else {
            this._memoryPrivateBytesGauge.removeCallback(this._memoryPrivateBytesGaugeCallback);
            this._memoryAvailableBytesGauge.removeCallback(this._memoryAvailableBytesGaugeCallback);
            this._processTimeGauge.removeCallback(this._processTimeGaugeCallback);
            this._processorTimeGauge.removeCallback(this._processorTimeGaugeCallback);
            this._memoryCommittedBytesGauge.removeCallback(this._memoryCommittedBytesGaugeCallback);
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
}
