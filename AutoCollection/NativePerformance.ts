import TelemetryClient = require("../Library/TelemetryClient");
import Constants = require("../Declarations/Constants");
import Context = require("../Library/Context");
import Logging = require("../Library/Logging");
import { IBaseConfig } from "../Declarations/Interfaces";
import Statsbeat = require("./Statsbeat");

/**
 * Interface which defines which specific extended metrics should be disabled
 *
 * @export
 * @interface IDisabledExtendedMetrics
 */
export interface IDisabledExtendedMetrics {
    gc?: boolean;
    heap?: boolean;
    loop?: boolean;
}

export class AutoCollectNativePerformance {
    public static INSTANCE: AutoCollectNativePerformance;

    private static _emitter: any;
    private static _metricsAvailable: boolean; // is the native metrics lib installed
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _handle: NodeJS.Timer;
    private _client: TelemetryClient;
    private _disabledMetrics: IDisabledExtendedMetrics = {};
    private _statsbeat: Statsbeat;

    constructor(client: TelemetryClient) {
        // Note: Only 1 instance of this can exist. So when we reconstruct this object,
        // just disable old native instance and reset JS member variables
        if (AutoCollectNativePerformance.INSTANCE) {
            AutoCollectNativePerformance.INSTANCE.dispose();
        }
        AutoCollectNativePerformance.INSTANCE = this;
        this._client = client;
        this._statsbeat = this._client.getStatsbeat();
    }

    /**
     * Start instance of native metrics agent.
     *
     * @param {boolean} isEnabled
     * @param {number} [collectionInterval=60000]
     * @memberof AutoCollectNativePerformance
     */
    public enable(isEnabled: boolean, disabledMetrics: IDisabledExtendedMetrics = {}, collectionInterval = 60000): void {
        if (AutoCollectNativePerformance._metricsAvailable == undefined && isEnabled && !this._isInitialized) {
            // Try to require in the native-metrics library. If it's found initialize it, else do nothing and never try again.
            try {
                const NativeMetricsEmitters = require("applicationinsights-native-metrics");
                AutoCollectNativePerformance._emitter = new NativeMetricsEmitters();
                AutoCollectNativePerformance._metricsAvailable = true;
                // Should only set statsbeat feature if it's the first time calling enabled
                if (!this._isEnabled) {
                    this._statsbeat.addFeature(Constants.StatsbeatFeature.NATIVE_METRICS);
                }
                Logging.info("Native metrics module successfully loaded!");
            } catch (err) {
                // Package not available. Never try again
                AutoCollectNativePerformance._metricsAvailable = false;
                return;
            }
        }

        this._isEnabled = isEnabled;
        this._disabledMetrics = disabledMetrics
        if (this._isEnabled && !this._isInitialized) {
            this._isInitialized = true;
        }

        // Enable the emitter if we were able to construct one
        if (this._isEnabled && AutoCollectNativePerformance._emitter) {
            // enable self
            AutoCollectNativePerformance._emitter.enable(true, collectionInterval);
            if (!this._handle) {
                this._handle = setInterval(() => this._trackNativeMetrics(), collectionInterval);
                this._handle.unref();
            }
        } else if (AutoCollectNativePerformance._emitter) {
            // disable self
            AutoCollectNativePerformance._emitter.enable(false);
            if (this._handle) {
                clearInterval(this._handle);
                this._handle = undefined;
            }
        }
    }

    /**
     * Cleanup this instance of AutoCollectNativePerformance
     *
     * @memberof AutoCollectNativePerformance
     */
    public dispose(): void {
        this.enable(false);
        this._statsbeat.removeFeature(Constants.StatsbeatFeature.NATIVE_METRICS);
    }

    /**
     * Parse environment variable and overwrite isEnabled based on respective fields being set
     *
     * @private
     * @static
     * @param {(boolean | IDisabledExtendedMetrics)} collectExtendedMetrics
     * @param {(IBaseConfig)} customConfig
     * @returns {(boolean | IDisabledExtendedMetrics)}
     * @memberof AutoCollectNativePerformance
     */
    public static parseEnabled(collectExtendedMetrics: boolean | IDisabledExtendedMetrics, customConfig: IBaseConfig): { isEnabled: boolean, disabledMetrics: IDisabledExtendedMetrics } {
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
                return { isEnabled: true, disabledMetrics: { ...collectExtendedMetrics, ...disabledMetrics } };
            }

            // case 2b: collectExtendedMetrics is a boolean, set disabledMetrics as is
            return { isEnabled: collectExtendedMetrics, disabledMetrics };
        }

        // case 4: no env vars set, input arg is a boolean, RETURN with isEnabled=collectExtendedMetrics, disabledMetrics={}
        if (typeof collectExtendedMetrics === "boolean") {
            return { isEnabled: collectExtendedMetrics, disabledMetrics: {} };
        } else { // use else so we don't need to force typing on collectExtendedMetrics
            // case 5: no env vars set, input arg is object, RETURN with isEnabled=true, disabledMetrics=collectExtendedMetrics
            return { isEnabled: true, disabledMetrics: collectExtendedMetrics };
        }
    }

    /**
     * Trigger an iteration of native metrics collection
     *
     * @private
     * @memberof AutoCollectNativePerformance
     */
    private _trackNativeMetrics() {
        let shouldSendAll = true;
        if (typeof this._isEnabled !== "object") {
            shouldSendAll = this._isEnabled;
        }

        if (shouldSendAll) {
            this._trackGarbageCollection();
            this._trackEventLoop();
            this._trackHeapUsage();
        }
    }

    /**
     * Tracks garbage collection stats for this interval. One custom metric is sent per type of garbage
     * collection that occurred during this collection interval.
     *
     * @private
     * @memberof AutoCollectNativePerformance
     */
    private _trackGarbageCollection(): void {
        if (this._disabledMetrics.gc) {
            return;
        }

        const gcData = AutoCollectNativePerformance._emitter.getGCData();

        for (let gc in gcData) {
            const metrics = gcData[gc].metrics;
            const name = `${gc} Garbage Collection Duration`;
            const stdDev = Math.sqrt(metrics.sumSquares / metrics.count - Math.pow(metrics.total / metrics.count, 2)) || 0;
            this._client.trackMetric({
                name: name,
                value: metrics.total,
                count: metrics.count,
                max: metrics.max,
                min: metrics.min,
                stdDev: stdDev,
                tagOverrides: {
                    [this._client.context.keys.internalSdkVersion]: "node-nativeperf:" + Context.sdkVersion
                }
            });
        }
    }

    /**
     * Tracks event loop ticks per interval as a custom metric. Also included in the metric is min/max/avg
     * time spent in event loop for this interval.
     *
     * @private
     * @returns {void}
     * @memberof AutoCollectNativePerformance
     */
    private _trackEventLoop(): void {
        if (this._disabledMetrics.loop) {
            return;
        }

        const loopData = AutoCollectNativePerformance._emitter.getLoopData();
        const metrics = loopData.loopUsage;
        if (metrics.count == 0) {
            return;
        }

        const name = "Event Loop CPU Time";
        const stdDev = Math.sqrt(metrics.sumSquares / metrics.count - Math.pow(metrics.total / metrics.count, 2)) || 0;
        this._client.trackMetric({
            name: name,
            value: metrics.total,
            count: metrics.count,
            min: metrics.min,
            max: metrics.max,
            stdDev: stdDev,
            tagOverrides: {
                [this._client.context.keys.internalSdkVersion]: "node-nativeperf:" + Context.sdkVersion
            }
        });
    }

    /**
     * Track heap memory usage metrics as a custom metric.
     *
     * @private
     * @memberof AutoCollectNativePerformance
     */
    private _trackHeapUsage(): void {
        if (this._disabledMetrics.heap) {
            return;
        }

        const memoryUsage = process.memoryUsage();
        const { heapUsed, heapTotal, rss } = memoryUsage;

        this._client.trackMetric({
            name: "Memory Usage (Heap)",
            value: heapUsed,
            count: 1,
            tagOverrides: {
                [this._client.context.keys.internalSdkVersion]: "node-nativeperf:" + Context.sdkVersion
            }
        });
        this._client.trackMetric({
            name: "Memory Total (Heap)",
            value: heapTotal,
            count: 1,
            tagOverrides: {
                [this._client.context.keys.internalSdkVersion]: "node-nativeperf:" + Context.sdkVersion
            }
        });
        this._client.trackMetric({
            name: "Memory Usage (Non-Heap)",
            value: rss - heapTotal,
            count: 1,
            tagOverrides: {
                [this._client.context.keys.internalSdkVersion]: "node-nativeperf:" + Context.sdkVersion
            }
        });
    }
}
