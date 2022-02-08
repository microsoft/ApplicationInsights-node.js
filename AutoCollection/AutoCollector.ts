import { AutoCollectConsole } from "./Console";
import { AutoCollectExceptions } from "./Exceptions";
import { AutoCollectPerformance } from "./Performance";
import { AutoCollectPreAggregatedMetrics } from "./PreAggregatedMetrics";
import { HeartBeat } from "./HeartBeat";
import { TelemetryClient } from "../Library/TelemetryClient";
import { AutoCollectNativePerformance } from "./NativePerformance";
import { IDisabledExtendedMetrics } from "../Declarations/Interfaces";
import {
    IMetricDependencyDimensions,
    IMetricExceptionDimensions,
    IMetricRequestDimensions,
    IMetricTraceDimensions
} from "../Declarations/Metrics/AggregatedMetricDimensions";


export class AutoCollector {
    // Default values
    public isConsole = true;
    public isConsoleLog = false;
    public isExceptions = true;
    public isPerformance = true;
    public isPreAggregatedMetrics = true;
    public isHeartBeat = false;
    public isRequests = true;
    public isDependencies = true;
    public isNativePerformance = true;
    public isCorrelating = true;
    public forceClsHooked: boolean;
    public disabledExtendedMetrics: IDisabledExtendedMetrics;

    private _console: AutoCollectConsole;
    private _exceptions: AutoCollectExceptions;
    private _performance: AutoCollectPerformance;
    private _preAggregatedMetrics: AutoCollectPreAggregatedMetrics;
    private _heartbeat: HeartBeat;
    private _nativePerformance: AutoCollectNativePerformance;
    private _client: TelemetryClient;
    private _isStarted = false;

    constructor(client: TelemetryClient) {
        this._client = client;
        this._initializeFlagsFromConfig();
        this._console = new AutoCollectConsole(client);
        this._exceptions = new AutoCollectExceptions(client);
        this._performance = new AutoCollectPerformance(client);
        this._preAggregatedMetrics = new AutoCollectPreAggregatedMetrics(client);
        this._heartbeat = new HeartBeat(client);
        if (!this._nativePerformance) {
            this._nativePerformance = new AutoCollectNativePerformance(client);
        }
    }

    public start() {
        this._isStarted = true;
        this._console.enable(this.isConsole, this.isConsoleLog);
        this._exceptions.enable(this.isExceptions);
        this._performance.enable(this.isPerformance);
        this._preAggregatedMetrics.enable(this.isPreAggregatedMetrics);
        this._heartbeat.enable(this.isHeartBeat);
        this._nativePerformance.enable(this.isNativePerformance, this.disabledExtendedMetrics);
    }

    public dispose() {
        this._console.enable(false, false);
        this._console = null;
        this._exceptions.enable(false);
        this._exceptions = null;
        this._performance.enable(false);
        this._performance = null;
        this._preAggregatedMetrics.enable(false);
        this._preAggregatedMetrics = null;
        this._heartbeat.enable(false);
        this._heartbeat = null;
        this._nativePerformance.enable(false);
        this._nativePerformance = null;
    }

    public setAutoCollectConsole(value: boolean, collectConsoleLog: boolean = false) {
        this.isConsole = value;
        this.isConsoleLog = collectConsoleLog;
        if (this._isStarted) {
            this._console.enable(value, collectConsoleLog);
        }
    }

    public setAutoCollectExceptions(value: boolean) {
        this.isExceptions = value;
        if (this._isStarted) {
            this._exceptions.enable(value);
        }
    }

    public setAutoCollectPerformance(value: boolean, collectExtendedMetrics: boolean | IDisabledExtendedMetrics = true) {
        this.isPerformance = value;
        const extendedMetricsConfig = this._nativePerformance.parseEnabled(collectExtendedMetrics, this._client.config);
        this.isNativePerformance = extendedMetricsConfig.isEnabled;
        this.disabledExtendedMetrics = extendedMetricsConfig.disabledMetrics;
        if (this._isStarted) {

            this._performance.enable(value);
            this._nativePerformance.enable(extendedMetricsConfig.isEnabled, extendedMetricsConfig.disabledMetrics);
        }
    }

    public setAutoCollectPreAggregatedMetrics(value: boolean) {
        this.isPreAggregatedMetrics = value;
        if (this._isStarted) {
            this._preAggregatedMetrics.enable(value);
        }
    }

    public setAutoCollectHeartbeat(value: boolean) {
        this.isHeartBeat = value;
        if (this._isStarted) {
            this._heartbeat.enable(value);
        }
    }

    public setAutoCollectRequests(value: boolean) {
        this.isRequests = value;
        if (this._isStarted) {
            // TODO
        }
    }

    public setAutoCollectDependencies(value: boolean) {
        this.isDependencies = value;
        if (this._isStarted) {
            // TODO
        }
    }

    public setAutoDependencyCorrelation(value: boolean, useAsyncHooks?: boolean) {
        this.isCorrelating = value;
        this.forceClsHooked = useAsyncHooks;
        if (this._isStarted) {
            // TODO
        }
    }

    public countPerformanceDependency(duration: number | string, success: boolean) {
        this._performance.countDependency(duration, success);
    }

    public countPerformanceException() {
        this._performance.countException();
    }

    public countPerformanceRequest(duration: number | string, success: boolean) {
        this._performance.countRequest(duration, success);
    }

    public countPreAggregatedException(dimensions: IMetricExceptionDimensions) {
        this._preAggregatedMetrics.countException(dimensions);
    }

    public countPreAggregatedTrace(dimensions: IMetricTraceDimensions) {
        this._preAggregatedMetrics.countTrace(dimensions);
    }

    public countPreAggregatedRequest(duration: number | string, dimensions: IMetricRequestDimensions) {
        this._preAggregatedMetrics.countRequest(duration, dimensions);
    }

    public countPreAggregatedDependency(duration: number | string, dimensions: IMetricDependencyDimensions) {
        this._preAggregatedMetrics.countDependency(duration, dimensions);
    }

    private _initializeFlagsFromConfig() {
        this.isConsole = this._client.config.enableAutoCollectExternalLoggers !== undefined ? this._client.config.enableAutoCollectExternalLoggers : this.isConsole;
        this.isConsoleLog = this._client.config.enableAutoCollectConsole !== undefined ? this._client.config.enableAutoCollectConsole : this.isConsoleLog;
        this.isExceptions = this._client.config.enableAutoCollectExceptions !== undefined ? this._client.config.enableAutoCollectExceptions : this.isExceptions;
        this.isPerformance = this._client.config.enableAutoCollectPerformance !== undefined ? this._client.config.enableAutoCollectPerformance : this.isPerformance;
        this.isPreAggregatedMetrics = this._client.config.enableAutoCollectPreAggregatedMetrics !== undefined ? this._client.config.enableAutoCollectPreAggregatedMetrics : this.isPreAggregatedMetrics;
        this.isHeartBeat = this._client.config.enableAutoCollectHeartbeat !== undefined ? this._client.config.enableAutoCollectHeartbeat : this.isHeartBeat;
        this.isRequests = this._client.config.enableAutoCollectRequests !== undefined ? this._client.config.enableAutoCollectRequests : this.isRequests;
        this.isDependencies = this._client.config.enableAutoDependencyCorrelation !== undefined ? this._client.config.enableAutoDependencyCorrelation : this.isDependencies;
        this.isCorrelating = this._client.config.enableAutoDependencyCorrelation !== undefined ? this._client.config.enableAutoDependencyCorrelation : this.isCorrelating;
        this.forceClsHooked = this._client.config.enableUseAsyncHooks !== undefined ? this._client.config.enableUseAsyncHooks : this.forceClsHooked;
    }
}
