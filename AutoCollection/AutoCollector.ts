import AutoCollectConsole = require("./Console");
import AutoCollectExceptions = require("./Exceptions");
import AutoCollectPerformance = require("./Performance");
import AutoCollecPreAggregatedMetrics = require("./PreAggregatedMetrics");
import HeartBeat = require("./HeartBeat");
import AutoCollectHttpDependencies = require("./HttpDependencies");
import AutoCollectHttpRequests = require("./HttpRequests");
import TelemetryClient = require("../Library/NodeClient");
import { AutoCollectNativePerformance, IDisabledExtendedMetrics } from "./NativePerformance";
import { JsonConfig } from "../Library/JsonConfig";

class AutoCollector {

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
    private _preAggregatedMetrics: AutoCollecPreAggregatedMetrics;
    private _heartbeat: HeartBeat;
    private _nativePerformance: AutoCollectNativePerformance;
    private _serverRequests: AutoCollectHttpRequests;
    private _clientRequests: AutoCollectHttpDependencies;
    private _client: TelemetryClient;
    private _isStarted = false;

    public setup(client: TelemetryClient) {
        this._initializeFlagsFromConfig();
        this._client = client;
        this._console = new AutoCollectConsole(client);
        this._exceptions = new AutoCollectExceptions(client);
        this._performance = new AutoCollectPerformance(client);
        this._preAggregatedMetrics = new AutoCollecPreAggregatedMetrics(client);
        this._heartbeat = new HeartBeat(client);
        this._serverRequests = new AutoCollectHttpRequests(client);
        this._clientRequests = new AutoCollectHttpDependencies(client);
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
        this._serverRequests.useAutoCorrelation(this.isCorrelating, this.forceClsHooked);
        this._serverRequests.enable(this.isRequests);
        this._clientRequests.enable(this.isDependencies);
    }

    public dispose() {
        if (this._console) {
            this._console.dispose();
        }
        if (this._exceptions) {
            this._exceptions.dispose();
        }
        if (this._performance) {
            this._performance.dispose();
        }
        if (this._preAggregatedMetrics) {
            this._preAggregatedMetrics.dispose();
        }
        if (this._heartbeat) {
            this._heartbeat.dispose();
        }
        if (this._nativePerformance) {
            this._nativePerformance.dispose();
        }
        if (this._serverRequests) {
            this._serverRequests.dispose();
        }
        if (this._clientRequests) {
            this._clientRequests.dispose();
        }
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
        const extendedMetricsConfig = AutoCollectNativePerformance.parseEnabled(collectExtendedMetrics, JsonConfig.getJsonConfig());
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
            this._serverRequests.enable(value);
        }
    }

    public setAutoCollectDependencies(value: boolean) {
        this.isDependencies = value;
        if (this._isStarted) {
            this._clientRequests.enable(value);
        }
    }

    public setAutoDependencyCorrelation(value: boolean, useAsyncHooks?: boolean) {
        this.isCorrelating = value;
        this.forceClsHooked = useAsyncHooks;
        if (this._isStarted) {
            this._serverRequests.useAutoCorrelation(value, useAsyncHooks);
        }
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
        this.isNativePerformance = this._client.config.enableNativePerformance !== undefined ? this._client.config.enableNativePerformance : this.isNativePerformance;
        this.disabledExtendedMetrics = this._client.config.disabledExtendedMetrics !== undefined ? this._client.config.disabledExtendedMetrics : this.disabledExtendedMetrics;
    }
}

export = AutoCollector;