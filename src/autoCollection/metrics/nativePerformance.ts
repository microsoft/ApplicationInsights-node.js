import { Meter, ObservableGauge, ObservableResult, Histogram } from "@opentelemetry/api-metrics";
import { GarbageCollectionType, NativeMetricsCounter } from "../../declarations/constants";
import { Logger } from "../../library/logging";
import { IBaseConfig, IDisabledExtendedMetrics } from "../../library/configuration/interfaces";


export class AutoCollectNativePerformance {
    private _emitter: any;
    private _metricsAvailable: boolean; // is the native metrics lib installed
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _handle: NodeJS.Timer;
    private _meter: Meter;
    private _collectionInterval: number = 15000; // 15 seconds
    private _disabledMetrics: IDisabledExtendedMetrics = {};
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
    public enable(
        isEnabled: boolean,
        disabledMetrics: IDisabledExtendedMetrics = {}
    ): void {
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
        this._disabledMetrics = disabledMetrics;// TODO: Use to filter out metrics in View
        if (this._isEnabled && !this._isInitialized) {
            this._isInitialized = true;
        }

        // Enable the emitter if we were able to construct one
        if (this._isEnabled && this._emitter) {
            // enable self
            this._emitter.enable(true, this._collectionInterval);
            // Add histogram data collection
            if (!this._handle) {
                this._handle = setInterval(() => this._collectHistogramData(), this._collectionInterval);
                this._handle.unref();
            }
            // Add observable callbacks
            this._heapMemoryTotalGauge.addCallback(this._getHeapTotal);
            this._heapMemoryUsageGauge.addCallback(this._getHeapUsage);
            this._memoryUsageNonHeapGauge.addCallback(this._getNonHeapUsage);

        } else if (this._emitter) {
            // disable self
            this._emitter.enable(false);
            if (this._handle) {
                clearInterval(this._handle);
                this._handle = undefined;
            }
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
        const loopData = this._emitter.getLoopData();
        const metrics = loopData.loopUsage;
        if (metrics.count == 0) {
            return;
        }
        this._eventLoopHistogram.record(metrics.total);
    }

    private _getGarbageCollection() {
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
}


/**
* Parse environment variable and overwrite isEnabled based on respective fields being set
*
* @private
* @param {(boolean | IDisabledExtendedMetrics)} collectExtendedMetrics
* @param {(IBaseConfig)} customConfig
* @returns {(boolean | IDisabledExtendedMetrics)}
* @memberof AutoCollectNativePerformance
*/
export function getNativeMetricsConfig(
    collectExtendedMetrics: boolean | IDisabledExtendedMetrics,
    customConfig: IBaseConfig
): { isEnabled: boolean; disabledMetrics: IDisabledExtendedMetrics } {
    const disableAll = customConfig.disableAllExtendedMetrics;
    const individualOptOuts = customConfig.extendedMetricDisablers;

    // case 1: disable all env var set, RETURN with isEnabled=false
    if (disableAll) {
        return { isEnabled: false, disabledMetrics: {} };
    }

    // case 2: individual env vars set, RETURN with isEnabled=true, disabledMetrics={...}
    if (individualOptOuts) {
        const optOutsArr = individualOptOuts.split(",");
        const disabledMetrics: any = {};
        if (optOutsArr.length > 0) {
            for (const opt of optOutsArr) {
                disabledMetrics[opt] = true;
            }
        }

        // case 2a: collectExtendedMetrics is an object, overwrite existing ones if they exist
        if (typeof collectExtendedMetrics === "object") {
            return {
                isEnabled: true,
                disabledMetrics: { ...collectExtendedMetrics, ...disabledMetrics },
            };
        }

        // case 2b: collectExtendedMetrics is a boolean, set disabledMetrics as is
        return { isEnabled: collectExtendedMetrics, disabledMetrics };
    }

    // case 4: no env vars set, input arg is a boolean, RETURN with isEnabled=collectExtendedMetrics, disabledMetrics={}
    if (typeof collectExtendedMetrics === "boolean") {
        return { isEnabled: collectExtendedMetrics, disabledMetrics: {} };
    } else {
        // use else so we don't need to force typing on collectExtendedMetrics
        // case 5: no env vars set, input arg is object, RETURN with isEnabled=true, disabledMetrics=collectExtendedMetrics
        return { isEnabled: true, disabledMetrics: collectExtendedMetrics };
    }
}
