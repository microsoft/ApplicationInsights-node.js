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

class Statsbeat {

    public static CONNECTION_STRING = "InstrumentationKey=c4a29126-a7cb-47e5-b348-11414998b11e;IngestionEndpoint=https://dc.services.visualstudio.com/";
    public static STATS_COLLECTION_SHORT_INTERVAL: number = 900000; // 15 minutes
    public static STATS_COLLECTION_LONG_INTERVAL: number = 1440000; // 1 day

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

    private _sender: Sender;
    private _handle: NodeJS.Timer | null;
    private _longHandle: NodeJS.Timer | null;
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _config: Config;
    private _statsbeatConfig: Config;
    private _isVM: boolean | undefined;
    private _statbeatMetrics: Array<{ name: string; value: number, properties: {} }>;

    // Custom dimensions
    private _resourceProvider: string;
    private _resourceIdentifier: string;
    private _sdkVersion: string;
    private _runtimeVersion: string;
    private _os: string;
    private _language: string;
    private _cikey: string;
    private _attach: string = Constants.StatsbeatAttach.sdk; // Default is SDK
    private _features: number = Constants.StatsbeatFeature.NONE;
    private _instrumentations: number = Constants.StatsbeatInstrumentation.NONE;

    constructor(config: Config) {
        this._isInitialized = false;
        this._statbeatMetrics = [];
        this._config = config;
        this._statsbeatConfig = new Config(Statsbeat.CONNECTION_STRING);
        this._sender = new Sender(this._statsbeatConfig);
        this._lastRequests = { totalRequestCount: 0, time: 0 };
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
                    this.trackShortIntervalStatsbeats().catch((error) => {
                        // Failed to send Statsbeat
                        Logging.info(Statsbeat.TAG, error);
                    });
                }, Statsbeat.STATS_COLLECTION_SHORT_INTERVAL);
                this._handle.unref(); // Allow the app to terminate even while this loop is going on
            }
            if (!this._longHandle) {
                this.trackLongIntervalStatsbeats(); // On first enablement
                this._longHandle = setInterval(() => {
                    this.trackLongIntervalStatsbeats().catch((error) => {
                        // Failed to send Statsbeat
                        Logging.info(Statsbeat.TAG, error);
                    });
                }, Statsbeat.STATS_COLLECTION_LONG_INTERVAL);
                this._longHandle.unref(); // Allow the app to terminate even while this loop is going on
            }
        } else {
            if (this._handle) {
                clearInterval(this._handle);
                this._handle = null;
            }
            if (this._longHandle) {
                clearInterval(this._longHandle);
                this._longHandle = null;
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

    public async trackShortIntervalStatsbeats() {
        this._getResourceProvider(async () => {
            let networkProperties = {
                "os": this._os,
                "rp": this._resourceProvider,
                "cikey": this._cikey,
                "runtimeVersion": this._runtimeVersion,
                "language": this._language,
                "version": this._sdkVersion,
                "attach": this._attach,
            }
            this._trackRequestDuration(networkProperties);
            this._trackRequestsCount(networkProperties);
            await this._sendStatsbeats();
        });
    }

    public async trackLongIntervalStatsbeats() {
        this._getResourceProvider(async () => {
            let commonProperties = {
                "os": this._os,
                "rp": this._resourceProvider,
                "cikey": this._cikey,
                "runtimeVersion": this._runtimeVersion,
                "language": this._language,
                "version": this._sdkVersion,
                "attach": this._attach,
            };
            let featureProperties = Object.assign({ "feature": this._features }, commonProperties);
            let instrumentationProperties = Object.assign({ "instrumentation": this._instrumentations }, commonProperties);
            let attachProperties = Object.assign({
                "rpid": this._resourceIdentifier,
            }, commonProperties);
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.ATTACH, value: 1, properties: attachProperties });
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.INSTRUMENTATION, value: 1, properties: instrumentationProperties });
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.FEATURE, value: 1, properties: featureProperties });
            await this._sendStatsbeats();
        });
    }

    private _trackRequestDuration(properties: {}) {
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
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.REQUEST_DURATION, value: averageRequestExecutionTime, properties: properties });
        }
        this._lastRequests = requests;
    }

    private _trackRequestsCount(properties: {}) {
        if (this._totalSuccesfulRequestCount > 0) {
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.REQUEST_SUCCESS, value: this._totalSuccesfulRequestCount, properties: properties });
            this._totalSuccesfulRequestCount = 0; //Reset
        }
        if (this._totalFailedRequestCount > 0) {
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.REQUEST_FAILURE, value: this._totalFailedRequestCount, properties: properties });
            this._totalFailedRequestCount = 0; //Reset
        }
        if (this._retryCount > 0) {
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.RETRY_COUNT, value: this._retryCount, properties: properties });
            this._retryCount = 0; //Reset
        }
        if (this._throttleCount > 0) {
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.THROTTLE_COUNT, value: this._throttleCount, properties: properties });
            this._throttleCount = 0; //Reset
        }
        if (this._exceptionCount > 0) {
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.EXCEPTION_COUNT, value: this._exceptionCount, properties: properties });
            this._exceptionCount = 0; //Reset
        }
    }

    private async _sendStatsbeats() {
        let envelopes: Array<Contracts.Envelope> = [];
        for (let i = 0; i < this._statbeatMetrics.length; i++) {
            let statsbeat: Contracts.MetricTelemetry = {
                name: this._statbeatMetrics[i].name,
                value: this._statbeatMetrics[i].value,
                properties: this._statbeatMetrics[i].properties
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
        this._resourceProvider = Constants.StatsbeatResourceProvider.unknown;
        this._resourceIdentifier = Constants.StatsbeatResourceProvider.unknown;

        if (process.env.WEBSITE_SITE_NAME) { // Web apps
            this._resourceProvider = Constants.StatsbeatResourceProvider.appsvc;
            this._resourceIdentifier = process.env.WEBSITE_SITE_NAME;
            if (process.env.WEBSITE_HOME_STAMPNAME) {
                this._resourceIdentifier += "/" + process.env.WEBSITE_HOME_STAMPNAME;
            }
        } else if (process.env.FUNCTIONS_WORKER_RUNTIME) { // Function apps
            this._resourceProvider = Constants.StatsbeatResourceProvider.function;
            if (process.env.WEBSITE_HOSTNAME) {
                this._resourceIdentifier = process.env.WEBSITE_HOSTNAME;
            }
        } else if (this._config) {
            if (this._isVM === undefined || this._isVM == true) {
                waiting = true;
                Vm.AzureVirtualMachine.getAzureComputeMetadata(this._config, (vmInfo) => {
                    this._isVM = vmInfo.isVM;
                    if (this._isVM) {
                        this._resourceProvider = Constants.StatsbeatResourceProvider.vm;
                        this._resourceIdentifier = vmInfo.id + "/" + vmInfo.subscriptionId;
                        // Override OS as VM info have higher precedence
                        if (vmInfo.osType) {
                            this._os = vmInfo.osType;
                        }
                    }
                    callback();
                });
            } else {
                this._resourceProvider = Constants.StatsbeatResourceProvider.unknown;
            }
        }
        if (!waiting) {
            callback();
        }
    }
}

export = Statsbeat;
