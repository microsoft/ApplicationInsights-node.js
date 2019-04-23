import TelemetryClient= require("../Library/TelemetryClient");
import Constants = require("../Declarations/Constants");
import Config = require("../Library/Config");

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
    private _isEnabled: boolean | IDisabledExtendedMetrics;
    private _isInitialized: boolean;
    private _handle: NodeJS.Timer;
    private _client: TelemetryClient;

    constructor(client: TelemetryClient) {
        // Note: Only 1 instance of this can exist. So when we reconstruct this object,
        // just disable old native instance and reset JS member variables
        if (AutoCollectNativePerformance.INSTANCE) {
            AutoCollectNativePerformance.INSTANCE.dispose();
        }
        AutoCollectNativePerformance.INSTANCE = this;
        this._client = client;
    }

    /**
     *  Reports if NativePerformance is able to run in this environment
     */
    public static isNodeVersionCompatible() {
        var nodeVer = process.versions.node.split(".");
        return parseInt(nodeVer[0]) >= 6;
    }

    /**
     * Start instance of native metrics agent.
     *
     * @param {boolean} isEnabled
     * @param {number} [collectionInterval=60000]
     * @memberof AutoCollectNativePerformance
     */
    public enable(isEnabled: boolean | IDisabledExtendedMetrics, collectionInterval = 60000): void {
        if (!AutoCollectNativePerformance.isNodeVersionCompatible()) {
            return;
        }

        if (AutoCollectNativePerformance._metricsAvailable == undefined && isEnabled && !this._isInitialized) {
            // Try to require in the native-metrics library. If it's found initialize it, else do nothing and never try again.
            try {
                const NativeMetricsEmitters = require("applicationinsights-native-metrics");
                AutoCollectNativePerformance._emitter = new NativeMetricsEmitters();
                AutoCollectNativePerformance._metricsAvailable = true;
            } catch (err) {
                // Package not available. Never try again
                AutoCollectNativePerformance._metricsAvailable = false;
                return;
            }
        }

        this._isEnabled = AutoCollectNativePerformance._parseEnabled(isEnabled);
        if (this._isEnabled && !this._isInitialized) {
            this._isInitialized = true;
        }

        // Enable the emitter if we were able to construct one
        if (this._isEnabled && AutoCollectNativePerformance._emitter) {
            // enable self
            AutoCollectNativePerformance._emitter.enable(true, collectionInterval);
            this._handle = setInterval(() => this._trackNativeMetrics(), collectionInterval);
            this._handle.unref();
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
    }

    /**
     * Parse environment variable and overwrite isEnabled based on respective fields being set
     *
     * @private
     * @static
     * @param {(boolean | IDisabledExtendedMetrics)} isEnabled
     * @returns {(boolean | IDisabledExtendedMetrics)}
     * @memberof AutoCollectNativePerformance
     */
    private static _parseEnabled(isEnabled: boolean | IDisabledExtendedMetrics): boolean | IDisabledExtendedMetrics {
        const disableAll = process.env[Config.ENV_nativeMetricsDisableAll];
        const individualOptOuts = process.env[Config.ENV_nativeMetricsDisablers]

        if (disableAll) {
            return false;
        }

        if (individualOptOuts) {
            const optOutsArr = individualOptOuts.split(",");
            const disabledMetrics: any = {};
            if (optOutsArr.length > 0) {
                for (const opt of optOutsArr) {
                    disabledMetrics[opt] = true;
                }
            }

            if (typeof isEnabled === "object") {
                return {...isEnabled, ...disabledMetrics};
            }
            return disabledMetrics;
        }

        return isEnabled;
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
        if (typeof this._isEnabled === "object" && !this._isEnabled.gc) {
            return;
        }

        const gcData = AutoCollectNativePerformance._emitter.getGCData();

        for (let gc in gcData) {
            const metrics = gcData[gc].metrics;
            const name = `${Constants.NativeMetricsPrefix}: GarbageCollection/${gc}`;
            const stdDev = Math.sqrt(metrics.sumSquares / metrics.count - Math.pow(metrics.total / metrics.count, 2)) || 0;
            this._client.trackMetric({
                name: name,
                value: metrics.total,
                count: metrics.count,
                max: metrics.max,
                min: metrics.min,
                stdDev: stdDev
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
        if (typeof this._isEnabled === "object" && !this._isEnabled.loop) {
            return;
        }

        const loopData = AutoCollectNativePerformance._emitter.getLoopData();
        const metrics = loopData.loopUsage;
        if (metrics.count == 0) {
            return;
        }

        const name = `${Constants.NativeMetricsPrefix}: EventLoop/CPUTime (usecs)`
        const stdDev = Math.sqrt(metrics.sumSquares / metrics.count - Math.pow(metrics.total / metrics.count, 2)) || 0;
        this._client.trackMetric({
            name: name,
            value: metrics.total,
            count: metrics.count,
            min: metrics.min,
            max: metrics.max,
            stdDev: stdDev
        });
    }

    /**
     * Track heap memory usage metrics as a custom metric.
     *
     * @private
     * @memberof AutoCollectNativePerformance
     */
    private _trackHeapUsage(): void {
        if (typeof this._isEnabled === "object" && !this._isEnabled.heap) {
            return;
        }

        const memoryUsage = process.memoryUsage();
        const { heapUsed, heapTotal, rss } = memoryUsage;
        const namePrefix = Constants.NativeMetricsPrefix;

        this._client.trackMetric({
            name: `${namePrefix}: Memory/Heap/Usage (KB)`,
            value: heapUsed,
            count: 1
        });
        this._client.trackMetric({
            name: `${namePrefix}: Memory/Heap/Total (KB)`,
            value: heapTotal,
            count: 1
        });
        this._client.trackMetric({
            name: `${namePrefix}: Memory/Nonheap/Usage (KB)`,
            value: rss - heapTotal,
            count: 1
        });
    }
}
