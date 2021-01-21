import TelemetryClient = require("../Library/TelemetryClient");
import Constants = require("../Declarations/Constants");

import { AggregatedMetric } from "../Declarations/AggregatedMetric";
import * as Contracts from "../Declarations/Contracts";

class AutoCollecPreAggregatedMetrics {

    public static INSTANCE: AutoCollecPreAggregatedMetrics;

    private _collectionInterval: number;
    private _client: TelemetryClient;
    private _handle: NodeJS.Timer;
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _preAggregatedMetricsCollection: Array<AggregatedMetric>;

    constructor(client: TelemetryClient, collectionInterval = 60000) {
        if (!AutoCollecPreAggregatedMetrics.INSTANCE) {
            AutoCollecPreAggregatedMetrics.INSTANCE = this;
        }

        this._isInitialized = false;
        this._preAggregatedMetricsCollection = [];
        this._client = client;
        this._collectionInterval = collectionInterval;
    }

    public enable(isEnabled: boolean, collectionInterval?: number) {
        this._isEnabled = isEnabled;
        if (this._isEnabled && !this._isInitialized) {
            this._isInitialized = true;
        }

        if (isEnabled) {
            if (!this._handle) {
                this._collectionInterval = collectionInterval || this._collectionInterval;
                this._handle = setInterval(() => this.trackPreAggregatedMetrics(), this._collectionInterval);
                this._handle.unref(); // Allow the app to terminate even while this loop is going on
            }
        } else {
            if (this._handle) {
                clearInterval(this._handle);
                this._handle = undefined;
            }
        }
    }


    public static countRequest(duration: number | string, success: boolean) {

    }

    public static countException() {

    }

    public static countDependency(duration: number | string, success: boolean) {

    }

    public isInitialized() {
        return this._isInitialized;
    }

    public static isEnabled() {
        return AutoCollecPreAggregatedMetrics.INSTANCE && AutoCollecPreAggregatedMetrics.INSTANCE._isEnabled;
    }

    public trackPreAggregatedMetrics() {
        this._trackRequestRate();
        this._trackDependencyRate();
        this._trackExceptionRate();
    }

    private _getPreAggregatedMetric(metricType: Constants.MetricId, dimensions: { [key: string]: any; }) {
        this._preAggregatedMetricsCollection
    }



    private _trackRequestRate() {

    }

    private _trackDependencyRate() {

    }

    private _trackExceptionRate() {

    }

    private _trackPreAggregatedMetric(metric: AggregatedMetric) {
        let telemetry: Contracts.MetricTelemetry = {
            name: metric.name,
            value: metric.value,
            properties: metric.dimensions,
            kind: "Aggregation",
        };
        telemetry.properties = {
            ...telemetry.properties,
            "_MS.MetricId": metric.metricType,
            "_MS.AggregationIntervalMs": String(metric.aggregationInterval),
            "_MS.IsAutocollected": "True",
        };

        this._client.trackMetric(telemetry);
    }

    public dispose() {
        AutoCollecPreAggregatedMetrics.INSTANCE = null;
        this.enable(false);
        this._isInitialized = false;
    }
}

export = AutoCollecPreAggregatedMetrics;
