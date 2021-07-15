import os = require("os");
import EnvelopeFactory = require("../Library/EnvelopeFactory");
import Sender = require("../Library/Sender");
import Constants = require("../Declarations/Constants");
import Contracts = require("../Declarations/Contracts");
import AzureVirtualMachine = require("../Library/AzureVirtualMachine");
import Config = require("../Library/Config");
import Context = require("../Library/Context");

const STATS_BEAT_LANGUAGE = "node";
const STATS_BEAT_CONNECTIONSTRING = "{STATS BEAT CONNECTION STRING}}";


export class StatsBeat {

    // Counters
    private _lastRequests: { totalRequestCount: number; time: number; };
    private _totalRequestCount: number = 0;
    private _totalSuccesfulRequestCount: number = 0;
    private _totalFailedRequestCount: number = 0;
    private _retryCount: number = 0;
    private _exceptionCount: number = 0;
    private _throttleCount: number = 0;
    private _intervalRequestExecutionTime: number = 0;
    private _lastIntervalRequestExecutionTime: number = 0;

    private _collectionInterval: number = 900000; // 15 minutes
    private _sender: Sender;
    private _handle: NodeJS.Timer | null;
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _config: Config;
    private _statsBeatConfig: Config;

    // Custom dimensions
    private _resourceProvider: string;
    private _sdkVersion: string;
    private _runtimeVersion: string;
    private _os: string;
    private _language: string;
    private _ciIkey: string;
    private _attach: string = Constants.StatsBeatAttach.sdk; // Default is SDK
    private _features: number = Constants.StatsBeatFeature.NONE;
    private _instrumentations: number = Constants.StatsBeatInstrumentation.NONE;

    constructor(config?: Config) {
        this._isInitialized = false;
        this._config = config;
        this._statsBeatConfig = new Config(STATS_BEAT_CONNECTIONSTRING);
        this._sender = new Sender(this._statsBeatConfig);
    }

    public enable(isEnabled: boolean) {
        this._isEnabled = isEnabled;
        if (this._isEnabled && !this._isInitialized) {
            this._getCustomProperties();
            this._isInitialized = true;
        }
        if (isEnabled) {
            if (!this._handle) {
                this._lastRequests = {
                    totalRequestCount: this._totalRequestCount,
                    time: +new Date
                };
                this._handle = setInterval(() => {
                    this.trackStatsBeatMetrics()
                }, this._collectionInterval);
                this._handle.unref(); // Allow the app to terminate even while this loop is going on
            }
        } else {
            if (this._handle) {
                clearInterval(this._handle);
                this._handle = null;
            }
        }
    }

    public isInitialized() {
        return this._isInitialized;
    }

    public isEnabled() {
        return this._isEnabled;
    }

    public setCodelessAttach() {
        this._attach = Constants.StatsBeatAttach.codeless;
    }

    public addFeature(feature: Constants.StatsBeatFeature) {
        this._features |= feature;
    }

    public removeFeature(feature: Constants.StatsBeatFeature) {
        this._features &= ~feature;
    }

    public addInstrumentation(instrumentation: Constants.StatsBeatInstrumentation) {
        this._instrumentations |= instrumentation;
    }

    public removeInstrumentation(instrumentation: Constants.StatsBeatInstrumentation) {
        this._instrumentations &= ~instrumentation;
    }

    public countRequest(duration: number, success: boolean) {
        if (!this.isEnabled()) {
            return;
        }
        this._totalRequestCount++;
        this._intervalRequestExecutionTime += duration;
        if (success === false) {
            this._totalFailedRequestCount++;
        }
        else {
            this._totalSuccesfulRequestCount++;
        }
    }

    public countException() {
        if (!this.isEnabled()) {
            return;
        }
        this._exceptionCount++;
    }

    public countThrottle() {
        if (!this.isEnabled()) {
            return;
        }
        this._throttleCount++;
    }

    public countRetry() {
        if (!this.isEnabled()) {
            return;
        }
        this._retryCount++;
    }

    public trackStatsBeatMetrics() {
        this._trackRequestDuration();
        this._trackRequestsCount();
    }

    private _trackRequestDuration() {
        var lastRequests = this._lastRequests;
        var requests = {
            totalRequestCount: this._totalRequestCount,
            time: +new Date
        };
        var intervalRequests = (requests.totalRequestCount - lastRequests.totalRequestCount) || 0;
        var elapsedMs = requests.time - lastRequests.time;
        var averageRequestExecutionTime = ((this._intervalRequestExecutionTime - this._lastIntervalRequestExecutionTime) / intervalRequests) || 0; // default to 0 in case no requests in this interval
        this._lastIntervalRequestExecutionTime = this._intervalRequestExecutionTime; // reset
        if (elapsedMs > 0 && intervalRequests > 0) {
            this._trackStatsBeat(Constants.StatsBeatCounter.REQUEST_DURATION, averageRequestExecutionTime);
        }
        this._lastRequests = requests;
    }

    private _trackRequestsCount() {
        if (this._totalSuccesfulRequestCount > 0) {
            this._trackStatsBeat(Constants.StatsBeatCounter.REQUEST_SUCCESS, this._totalSuccesfulRequestCount);
            this._totalSuccesfulRequestCount = 0; //Reset
        }
        if (this._totalFailedRequestCount > 0) {
            this._trackStatsBeat(Constants.StatsBeatCounter.REQUEST_FAILURE, this._totalFailedRequestCount);
            this._totalFailedRequestCount = 0; //Reset
        }
        if (this._retryCount > 0) {
            this._trackStatsBeat(Constants.StatsBeatCounter.RETRY_COUNT, this._retryCount);
            this._retryCount = 0; //Reset
        }
        if (this._throttleCount > 0) {
            this._trackStatsBeat(Constants.StatsBeatCounter.THROTTLE_COUNT, this._throttleCount);
            this._throttleCount = 0; //Reset
        }
        if (this._exceptionCount > 0) {
            this._trackStatsBeat(Constants.StatsBeatCounter.EXCEPTION_COUNT, this._exceptionCount);
            this._exceptionCount = 0; //Reset
        }
    }

    private _trackStatsBeat(metricName: string, value: number) {
        let statsBeat: Contracts.MetricTelemetry = {
            name: metricName,
            value: value,
            properties: {
                "os": this._os,
                "rp": this._resourceProvider,
                "cikey": this._ciIkey,
                "runtimeVersion": this._runtimeVersion,
                "language": this._language,
                "version": this._sdkVersion,
                "attach": this._attach,
                "instrumentation": this._instrumentations,
                "feature": this._features,
            }
        };
        let envelope = EnvelopeFactory.createEnvelope(statsBeat, Contracts.TelemetryType.Metric, null, null, this._statsBeatConfig);
        envelope.name = Constants.StatsBeatMetricName;
        this._sender.send([envelope]);
    }

    private _getCustomProperties() {
        this._language = STATS_BEAT_LANGUAGE;
        this._ciIkey = this._config.instrumentationKey;
        this._sdkVersion = Context.sdkVersion; // "node" or "node-nativeperf"
        this._os = os.type();
        this._runtimeVersion = process.version;
        // Check resource provider
        if (process.env.WEBSITE_SITE_NAME) { // Web apps
            this._resourceProvider = Constants.StatsBeatResourceProvider.appsvc;
        } else if (process.env.FUNCTIONS_WORKER_RUNTIME) { // Function apps
            this._resourceProvider = Constants.StatsBeatResourceProvider.function;
        } else if (this._config) {
            let vm = new AzureVirtualMachine(this._config);
            if (vm.isVM) {
                this._resourceProvider = Constants.StatsBeatResourceProvider.vm;
            }
        } else {
            this._resourceProvider = Constants.StatsBeatResourceProvider.unknown;
        }
    }
}

