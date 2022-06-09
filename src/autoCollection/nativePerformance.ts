import { MetricHandler } from "../library/handlers";
import { Logger } from "../library/logging";
import { IBaseConfig, IDisabledExtendedMetrics } from "../library/configuration/interfaces";


export class AutoCollectNativePerformance {
    private _emitter: any;
    private _metricsAvailable: boolean; // is the native metrics lib installed
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _handle: NodeJS.Timer;
    private _handler: MetricHandler;
    private _disabledMetrics: IDisabledExtendedMetrics = {};

    constructor(handler: MetricHandler) {
        this._handler = handler;
    }

    /**
     * Start instance of native metrics agent.
     *
     * @param {boolean} isEnabled
     * @param {number} [collectionInterval=60000]
     * @memberof AutoCollectNativePerformance
     */
    public enable(
        isEnabled: boolean,
        disabledMetrics: IDisabledExtendedMetrics = {},
        collectionInterval = 60000
    ): void {
        if (this._metricsAvailable == undefined && isEnabled && !this._isInitialized) {
            // Try to require in the native-metrics library. If it's found initialize it, else do nothing and never try again.
            try {
                const NativeMetricsEmitters = require("applicationinsights-native-metrics");
                this._emitter = new NativeMetricsEmitters();
                this._metricsAvailable = true;
                Logger.getInstance().info("Native metrics module successfully loaded!");
            } catch (err) {
                // Package not available. Never try again
                this._metricsAvailable = false;
                return;
            }
        }

        this._isEnabled = isEnabled;
        this._disabledMetrics = disabledMetrics;
        if (this._isEnabled && !this._isInitialized) {
            this._isInitialized = true;
        }

        // Enable the emitter if we were able to construct one
        if (this._isEnabled && this._emitter) {
            // enable self
            this._emitter.enable(true, collectionInterval);
            if (!this._handle) {
                this._handle = setInterval(() => this._trackNativeMetrics(), collectionInterval);
                this._handle.unref();
            }
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
     * Parse environment variable and overwrite isEnabled based on respective fields being set
     *
     * @private
     * @param {(boolean | IDisabledExtendedMetrics)} collectExtendedMetrics
     * @param {(IBaseConfig)} customConfig
     * @returns {(boolean | IDisabledExtendedMetrics)}
     * @memberof AutoCollectNativePerformance
     */
    public parseEnabled(
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

        const gcData = this._emitter.getGCData();

        for (let gc in gcData) {
            const metrics = gcData[gc].metrics;

            const name = `${gc} Garbage Collection Duration`;
            const stdDev =
                Math.sqrt(
                    metrics.sumSquares / metrics.count - Math.pow(metrics.total / metrics.count, 2)
                ) || 0;
            this._handler.trackMetric({
                metrics: [
                    {
                        name: name,
                        value: metrics.total,
                        count: metrics.count,
                        max: metrics.max,
                        min: metrics.min,
                        stdDev: stdDev,
                    },
                ],
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

        const loopData = this._emitter.getLoopData();
        const metrics = loopData.loopUsage;
        if (metrics.count == 0) {
            return;
        }

        const name = "Event Loop CPU Time";
        const stdDev =
            Math.sqrt(
                metrics.sumSquares / metrics.count - Math.pow(metrics.total / metrics.count, 2)
            ) || 0;
        this._handler.trackMetric({
            metrics: [
                {
                    name: name,
                    value: metrics.total,
                    count: metrics.count,
                    min: metrics.min,
                    max: metrics.max,
                    stdDev: stdDev,
                },
            ],
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

        this._handler.trackMetric({
            metrics: [
                {
                    name: "Memory Usage (Heap)",
                    value: heapUsed,
                    count: 1,
                },
            ],
        });
        this._handler.trackMetric({
            metrics: [
                {
                    name: "Memory Total (Heap)",
                    value: heapTotal,
                    count: 1,
                },
            ],
        });
        this._handler.trackMetric({
            metrics: [
                {
                    name: "Memory Usage (Non-Heap)",
                    value: rss - heapTotal,
                    count: 1,
                },
            ],
        });
    }
}
