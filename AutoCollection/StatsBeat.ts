import os = require("os");
import EnvelopeFactory = require("../Library/EnvelopeFactory");
import Logging = require("../Library/Logging");
import Sender = require("../Library/Sender");
import Constants = require("../Declarations/Constants");
import Contracts = require("../Declarations/Contracts");
import Vm = require("../Library/AzureVirtualMachine");
import Config = require("../Library/Config");
import Context = require("../Library/Context");

const STATSBEAT_LANGUAGE = "node";
const STATSBEAT_CONNECTIONSTRING = "InstrumentationKey=c4a29126-a7cb-47e5-b348-11414998b11e;IngestionEndpoint=https://dc.services.visualstudio.com/";


class Statsbeat {

    private static TAG = "Statsbeat";

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
    private _statsbeatConfig: Config;
    private _isVM: boolean;
    private _statbeatMetrics: Array<{ name: string; value: number }>;

    // Custom dimensions
    private _resourceProvider: string;
    private _sdkVersion: string;
    private _runtimeVersion: string;
    private _os: string;
    private _language: string;
    private _cikey: string;
    private _attach: string = Constants.StatsbeatAttach.sdk; // Default is SDK
    private _features: number = Constants.StatsbeatFeature.NONE;
    private _instrumentations: number = Constants.StatsbeatInstrumentation.NONE;

    constructor(config?: Config) {
        this._isInitialized = false;
        this._statbeatMetrics = [];
        this._config = config;
        this._statsbeatConfig = new Config(STATSBEAT_CONNECTIONSTRING);
        this._sender = new Sender(this._statsbeatConfig);
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
                    this.trackStatsbeatMetrics().catch((error) => {
                        // Failed to send Statsbeat
                        Logging.info(Statsbeat.TAG, error);
                    });
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
        this._attach = Constants.StatsbeatAttach.codeless;
    }

    public addFeature(feature: Constants.StatsbeatFeature) {
        this._features |= feature;
    }

    public removeFeature(feature: Constants.StatsbeatFeature) {
        this._features &= ~feature;
    }

    public addInstrumentation(instrumentation: Constants.StatsbeatInstrumentation) {
        this._instrumentations |= instrumentation;
    }

    public removeInstrumentation(instrumentation: Constants.StatsbeatInstrumentation) {
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

    public async trackStatsbeatMetrics() {
        this._getResourceProvider(async () => {
            this._trackRequestDuration();
            this._trackRequestsCount();
            await this._sendStatsbeats();
        });
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
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.REQUEST_DURATION, value: averageRequestExecutionTime });
        }
        this._lastRequests = requests;
    }

    private _trackRequestsCount() {
        if (this._totalSuccesfulRequestCount > 0) {
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.REQUEST_SUCCESS, value: this._totalSuccesfulRequestCount });
            this._totalSuccesfulRequestCount = 0; //Reset
        }
        if (this._totalFailedRequestCount > 0) {
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.REQUEST_FAILURE, value: this._totalFailedRequestCount });
            this._totalFailedRequestCount = 0; //Reset
        }
        if (this._retryCount > 0) {
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.RETRY_COUNT, value: this._retryCount });
            this._retryCount = 0; //Reset
        }
        if (this._throttleCount > 0) {
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.THROTTLE_COUNT, value: this._throttleCount });
            this._throttleCount = 0; //Reset
        }
        if (this._exceptionCount > 0) {
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.EXCEPTION_COUNT, value: this._exceptionCount });
            this._exceptionCount = 0; //Reset
        }
    }

    private async _sendStatsbeats() {
        let envelopes: Array<Contracts.Envelope> = [];
        let properties = {
            "os": this._os,
            "rp": this._resourceProvider,
            "cikey": this._cikey,
            "runtimeVersion": this._runtimeVersion,
            "language": this._language,
            "version": this._sdkVersion,
            "attach": this._attach,
            "instrumentation": this._instrumentations,
            "feature": this._features,
        }
        for (let i = 0; i < this._statbeatMetrics.length; i++) {
            let statsbeat: Contracts.MetricTelemetry = {
                name: this._statbeatMetrics[i].name,
                value: this._statbeatMetrics[i].value,
                properties: properties
            };
            let envelope = EnvelopeFactory.createEnvelope(statsbeat, Contracts.TelemetryType.Metric, null, null, this._statsbeatConfig);
            envelope.name = Constants.StatsbeatTelemetryName;
            envelopes.push(envelope);
        }
        this._statbeatMetrics = [];
        await this._sender.send(envelopes);
    }

    private _getCustomProperties() {
        this._language = STATSBEAT_LANGUAGE;
        this._cikey = this._config.instrumentationKey;
        this._sdkVersion = Context.sdkVersion; // "node" or "node-nativeperf"
        this._os = os.type();
        this._runtimeVersion = process.version;
    }

    private _getResourceProvider(callback: () => void) {
        // Check resource provider
        let waiting: boolean = false;
        if (process.env.WEBSITE_SITE_NAME) { // Web apps
            this._resourceProvider = Constants.StatsbeatResourceProvider.appsvc;
        } else if (process.env.FUNCTIONS_WORKER_RUNTIME) { // Function apps
            this._resourceProvider = Constants.StatsbeatResourceProvider.function;
        } else if (this._config) {
            if (this._isVM === undefined) { // First VM check
                waiting = true;
                Vm.AzureVirtualMachine.getAzureComputeMetadata(this._config, (vmInfo) => {
                    this._isVM = vmInfo.isVM;
                    if (this._isVM) {
                        this._resourceProvider = Constants.StatsbeatResourceProvider.vm;
                    } else {
                        this._resourceProvider = Constants.StatsbeatResourceProvider.unknown;
                    }
                    callback();
                });
            } else {
                this._resourceProvider = Constants.StatsbeatResourceProvider.unknown;
            }
        } else {
            this._resourceProvider = Constants.StatsbeatResourceProvider.unknown;
        }
        if (!waiting) {
            callback();
        }
    }
}

export = Statsbeat;
