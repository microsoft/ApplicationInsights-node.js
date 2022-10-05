import { Meter, ObservableGauge, ObservableResult, Histogram } from "@opentelemetry/api-metrics";
import { GarbageCollectionType, NativeMetricsCounter } from "../types";
import { Logger } from "../../../library/logging";


export class NativePerformanceMetrics {
    private _emitter: any;
    private _metricsAvailable: boolean; // is the native metrics lib installed
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _handle: NodeJS.Timer;
    private _meter: Meter;
    private _collectionInterval: number = 15000; // 15 seconds
    private _eventLoopHistogram: Histogram;
    private _garbageCollectionScavenge: Histogram;
    private _garbageCollectionMarkSweepCompact: Histogram;
    private _garbageCollectionIncrementalMarking: Histogram;
    private _heapMemoryTotalGauge: ObservableGauge;
    private _heapMemoryUsageGauge: ObservableGauge;
    private _memoryUsageNonHeapGauge: ObservableGauge;


    constructor(meter: Meter) {
        this._meter = meter;
        this._eventLoopHistogram = this._meter.createHistogram(NativeMetricsCounter.EVENT_LOOP_CPU);
        this._garbageCollectionScavenge = this._meter.createHistogram(NativeMetricsCounter.GARBAGE_COLLECTION_SCAVENGE);
        this._garbageCollectionMarkSweepCompact = this._meter.createHistogram(NativeMetricsCounter.GARBAGE_COLLECTION_SWEEP_COMPACT);
        this._garbageCollectionIncrementalMarking = this._meter.createHistogram(NativeMetricsCounter.GARBAGE_COLLECTION_INCREMENTAL_MARKING);
        this._heapMemoryTotalGauge = this._meter.createObservableGauge(NativeMetricsCounter.HEAP_MEMORY_TOTAL);
        this._heapMemoryUsageGauge = this._meter.createObservableGauge(NativeMetricsCounter.HEAP_MEMORY_USAGE);
        this._memoryUsageNonHeapGauge = this._meter.createObservableGauge(NativeMetricsCounter.MEMORY_USAGE_NON_HEAP);
    }

    /**
     * Start instance of native metrics agent.
     *
     * @param {boolean} isEnabled
     * @memberof AutoCollectNativePerformance
     */
    public enable(isEnabled: boolean): void {
        if (this._metricsAvailable == undefined && isEnabled && !this._isInitialized) {
            // Try to require in the native-metrics library. If it's found initialize it, else do nothing and never try again.
            try {
                const NativeMetricsEmitter = require("applicationinsights-native-metrics");
                this._emitter = new NativeMetricsEmitter();
                this._metricsAvailable = true;
                Logger.getInstance().info("Native metrics module successfully loaded!");
            } catch (err) {
                // Package not available. Never try again
                this._metricsAvailable = false;
                return;
            }
        }
        this._isEnabled = isEnabled;
        if (this._isEnabled && !this._isInitialized) {
            this._isInitialized = true;
        }

        // Enable the emitter if we were able to construct one
        if (this._isEnabled && this._emitter) {
            try {
                // enable self
                this._emitter.enable(true, this._collectionInterval);
            }
            catch (err) {
                Logger.getInstance().error("Native metrics enable failed", err);
            }

            // Add histogram data collection
            if (!this._handle) {
                this._handle = setInterval(() => this._collectHistogramData(), this._collectionInterval);
                this._handle.unref();
            }
            // Add observable callbacks
            this._heapMemoryTotalGauge.addCallback(this._getHeapTotal.bind(this));
            this._heapMemoryUsageGauge.addCallback(this._getHeapUsage.bind(this));
            this._memoryUsageNonHeapGauge.addCallback(this._getNonHeapUsage.bind(this));

        } else if (this._emitter) {
            if (this._handle) {
                clearInterval(this._handle);
                this._handle = undefined;
            }
            // Remove observable callbacks
            this._heapMemoryTotalGauge.removeCallback(this._getHeapTotal);
            this._heapMemoryUsageGauge.removeCallback(this._getHeapUsage);
            this._memoryUsageNonHeapGauge.removeCallback(this._getNonHeapUsage);
        }
    }

    private _getHeapUsage(observableResult: ObservableResult) {
        const memoryUsage = process.memoryUsage();
        const { heapUsed } = memoryUsage;
        observableResult.observe(heapUsed);
    }

    private _getHeapTotal(observableResult: ObservableResult) {
        const memoryUsage = process.memoryUsage();
        const { heapTotal } = memoryUsage;
        observableResult.observe(heapTotal);
    }

    private _getNonHeapUsage(observableResult: ObservableResult) {
        const memoryUsage = process.memoryUsage();
        const { heapTotal, rss } = memoryUsage;
        observableResult.observe(rss - heapTotal);
    }

    private _collectHistogramData() {
        this._getEventLoopCpu();
        this._getGarbageCollection();
    }

    private _getEventLoopCpu() {
        try {
            const loopData = this._emitter.getLoopData();
            const metrics = loopData.loopUsage;
            if (metrics.count == 0) {
                return;
            }
            this._eventLoopHistogram.record(metrics.total);
        }
        catch (err) {
            Logger.getInstance().error("Native metrics failed to get event loop CPU", err);
        }
    }

    private _getGarbageCollection() {
        try {
            const gcData = this._emitter.getGCData();
            for (let gc in gcData) {
                const metrics = gcData[gc].metrics;
                switch (gc) {
                    case GarbageCollectionType.IncrementalMarking:
                        this._garbageCollectionIncrementalMarking.record(metrics.total);
                        break;
                    case GarbageCollectionType.MarkSweepCompact:
                        this._garbageCollectionMarkSweepCompact.record(metrics.total);
                        break;
                    case GarbageCollectionType.Scavenge:
                        this._garbageCollectionScavenge.record(metrics.total);
                        break;
                }
            }
        }
        catch (err) {
            Logger.getInstance().error("Native metrics failed to get event Garbage Collection metrics", err);
        }
    }
}
