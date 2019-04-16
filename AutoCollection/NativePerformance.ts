import TelemetryClient= require("../Library/TelemetryClient");
import Logging = require("../Library/Logging");
import Constants = require("../Declarations/Constants");

class AutoCollectNativePerformance {
    public static INSTANCE: AutoCollectNativePerformance;

    private _emitter: any;
    private _metricsAvailable: boolean; // is the native metrics lib installed
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _handle: NodeJS.Timer;
    private _client: TelemetryClient;

    constructor(client: TelemetryClient) {
        this._client = client;
    }

    /**
     * Start instance of native metrics agent.
     *
     * @param {boolean} isEnabled
     * @param {number} [collectionInterval=60000]
     * @memberof AutoCollectNativePerformance
     */
    public enable(isEnabled: boolean, collectionInterval = 60000): void {
        if (this._metricsAvailable == undefined && isEnabled && !this._isInitialized) {
            try {
                const NativeMetricsEmitters = require("applicationinsights-native-metrics");
                this._emitter = new NativeMetricsEmitters();
                this._metricsAvailable = true;
            } catch (err) {
                // Package not available. Do nothing here
                this._metricsAvailable = false;
                return;
            }
        }

        this._isEnabled = isEnabled;
        if (this._isEnabled && !this._isInitialized) {
            this._isInitialized = true;
        }

        if (isEnabled && this._emitter) {
            // enable self
            this._emitter.enable(true, collectionInterval);
            this._emitter.on("usage", (usage: any) => {
                this._trackResourceUsage(usage);
            });
            this._handle = setInterval(this._trackNativeMetrics, collectionInterval);
        } else if (this._emitter) {
            // disable self
            this._emitter.enable(false);
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
        AutoCollectNativePerformance.INSTANCE = null;
        this.enable(false);
        this._isInitialized = false;
    }

    private _trackNativeMetrics() {
        this._trackGarbageCollection();
        this._trackEventLoop();
    }

    /**
     * Tracks garbage collection stats for this interval. One custom metric is sent per type of garbage
     * collection that occurred during this collection interval.
     *
     * @private
     * @memberof AutoCollectNativePerformance
     */
    private _trackGarbageCollection(): void {
        const gcData = this._emitter.getGCData();

        for (let gc of gcData) {
            const metrics = gc.metrics;
            const name = `${Constants.NativeMetrics.GARBAGE_COLLECTION}: ${gc.type}`;
            this._client.trackMetric({
                name: name,
                value: metrics.total / metrics.count,
                count: metrics.count,
                max: metrics.max,
                min: metrics.min
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
        const loopStats = this._emitter.getLoopData();
        if (loopStats.count == 0) {
            return;
        }

        const name = `${Constants.NativeMetrics.EVENT_LOOP}: average tick time (usecs)`
        this._client.trackMetric({
            name: name,
            value: loopStats.total / loopStats.count,
            count: loopStats.count,
            min: loopStats.min,
            max: loopStats.max
        });
    }

    private _trackResourceUsage(usage: any) {

    }
}

export = AutoCollectNativePerformance;
