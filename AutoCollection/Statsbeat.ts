import os = require("os");
import EnvelopeFactory = require("../Library/EnvelopeFactory");
import Logging = require("../Library/Logging");
import Sender = require("../Library/Sender");
import Constants = require("../Declarations/Constants");
import Contracts = require("../Declarations/Contracts");
import Vm = require("../Library/AzureVirtualMachine");
import Config = require("../Library/Config");
import Context = require("../Library/Context");
import Network = require("./NetworkStatsbeat");

const STATSBEAT_LANGUAGE = "node";

class Statsbeat {

    public static CONNECTION_STRING = "InstrumentationKey=c4a29126-a7cb-47e5-b348-11414998b11e;IngestionEndpoint=https://dc.services.visualstudio.com/";
    public static STATS_COLLECTION_SHORT_INTERVAL: number = 900000; // 15 minutes
    public static STATS_COLLECTION_LONG_INTERVAL: number = 1440000; // 1 day

    private static TAG = "Statsbeat";

    private _networkStatsbeatCollection: Array<Network.NetworkStatsbeat>;
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
    private _feature: number = Constants.StatsbeatFeature.NONE;
    private _instrumentation: number = Constants.StatsbeatInstrumentation.NONE;

    constructor(config: Config) {
        this._isInitialized = false;
        this._statbeatMetrics = [];
        this._networkStatsbeatCollection = [];
        this._config = config;
        this._statsbeatConfig = new Config(Statsbeat.CONNECTION_STRING);
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
                this._handle = setInterval(() => {
                    this.trackShortIntervalStatsbeats().catch((error) => {
                        // Failed to send Statsbeat
                        Logging.info(Statsbeat.TAG, error);
                    });
                }, Statsbeat.STATS_COLLECTION_SHORT_INTERVAL);
                this._handle.unref(); // Allow the app to terminate even while this loop is going on
            }
            if (!this._longHandle) {
                // On first enablement
                this.trackLongIntervalStatsbeats().catch((error) => {
                    // Failed to send Statsbeat
                    Logging.info(Statsbeat.TAG, error);
                });
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
        this._feature |= feature;
    }

    public removeFeature(feature: Constants.StatsbeatFeature) {
        this._feature &= ~feature;
    }

    public addInstrumentation(instrumentation: Constants.StatsbeatInstrumentation) {
        this._instrumentation |= instrumentation;
    }

    public removeInstrumentation(instrumentation: Constants.StatsbeatInstrumentation) {
        this._instrumentation &= ~instrumentation;
    }

    public countRequest(category: number, endpoint: string, duration: number, success: boolean) {
        if (!this.isEnabled()) {
            return;
        }
        let counter: Network.NetworkStatsbeat = this._getNetworkStatsbeatCounter(category, endpoint);
        counter.totalRequestCount++;
        counter.intervalRequestExecutionTime += duration;
        if (success === false) {
            counter.totalFailedRequestCount++;
        }
        else {
            counter.totalSuccesfulRequestCount++;
        }

    }

    public countException(category: number, endpoint: string) {
        if (!this.isEnabled()) {
            return;
        }
        let counter: Network.NetworkStatsbeat = this._getNetworkStatsbeatCounter(category, endpoint);
        counter.exceptionCount++;
    }

    public countThrottle(category: number, endpoint: string) {
        if (!this.isEnabled()) {
            return;
        }
        let counter: Network.NetworkStatsbeat = this._getNetworkStatsbeatCounter(category, endpoint);
        counter.throttleCount++;
    }

    public countRetry(category: number, endpoint: string) {
        if (!this.isEnabled()) {
            return;
        }
        let counter: Network.NetworkStatsbeat = this._getNetworkStatsbeatCounter(category, endpoint);
        counter.retryCount++;
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
            let attachProperties = Object.assign({
                "rpid": this._resourceIdentifier,
            }, commonProperties);
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.ATTACH, value: 1, properties: attachProperties });
            let featureProperties = Object.assign({ "feature": this._feature, "type": Constants.StatsbeatFeatureType.Feature }, commonProperties);
            let instrumentationProperties = Object.assign({ "feature": this._instrumentation, "type": Constants.StatsbeatFeatureType.Instrumentation }, commonProperties);
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.FEATURE, value: 1, properties: instrumentationProperties });
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.FEATURE, value: 1, properties: featureProperties });
            await this._sendStatsbeats();
        });
    }

    private _getNetworkStatsbeatCounter(endpoint: number, host: string): Network.NetworkStatsbeat {
        // Check if counter is available
        for (let i = 0; i < this._networkStatsbeatCollection.length; i++) {
            // Same object
            if (endpoint === this._networkStatsbeatCollection[i].endpoint &&
                host === this._networkStatsbeatCollection[i].host) {
                return this._networkStatsbeatCollection[i];
            }
        }
        // Create a new one if not found
        let newCounter = new Network.NetworkStatsbeat(endpoint, host);
        this._networkStatsbeatCollection.push(newCounter);
        return newCounter;
    }

    private _trackRequestDuration(commonProperties: {}) {
        for (let i = 0; i < this._networkStatsbeatCollection.length; i++) {
            var currentCounter = this._networkStatsbeatCollection[i];
            currentCounter.time = +new Date;
            var intervalRequests = (currentCounter.totalRequestCount - currentCounter.lastRequestCount) || 0;
            var elapsedMs = currentCounter.time - currentCounter.lastTime;
            var averageRequestExecutionTime = ((currentCounter.intervalRequestExecutionTime - currentCounter.lastIntervalRequestExecutionTime) / intervalRequests) || 0;
            currentCounter.lastIntervalRequestExecutionTime = currentCounter.intervalRequestExecutionTime; // reset
            if (elapsedMs > 0 && intervalRequests > 0) {
                // Add extra properties
                let properties = Object.assign({ "endpoint": this._networkStatsbeatCollection[i].endpoint, "host": this._networkStatsbeatCollection[i].host }, commonProperties);
                this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.REQUEST_DURATION, value: averageRequestExecutionTime, properties: properties });
            }
            // Set last counters
            currentCounter.lastRequestCount = currentCounter.totalRequestCount;
            currentCounter.lastTime = currentCounter.time;
        }
    }

    private _trackRequestsCount(commonProperties: {}) {
        for (let i = 0; i < this._networkStatsbeatCollection.length; i++) {
            var currentCounter = this._networkStatsbeatCollection[i];
            let properties = Object.assign({ "endpoint": currentCounter.endpoint, "host": currentCounter.host }, commonProperties);
            if (currentCounter.totalSuccesfulRequestCount > 0) {
                this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.REQUEST_SUCCESS, value: currentCounter.totalSuccesfulRequestCount, properties: properties });
                currentCounter.totalSuccesfulRequestCount = 0; //Reset
            }
            if (currentCounter.totalFailedRequestCount > 0) {
                this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.REQUEST_FAILURE, value: currentCounter.totalFailedRequestCount, properties: properties });
                currentCounter.totalFailedRequestCount = 0; //Reset
            }
            if (currentCounter.retryCount > 0) {
                this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.RETRY_COUNT, value: currentCounter.retryCount, properties: properties });
                currentCounter.retryCount = 0; //Reset
            }
            if (currentCounter.throttleCount > 0) {
                this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.THROTTLE_COUNT, value: currentCounter.throttleCount, properties: properties });
                currentCounter.throttleCount = 0; //Reset
            }
            if (currentCounter.exceptionCount > 0) {
                this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.EXCEPTION_COUNT, value: currentCounter.exceptionCount, properties: properties });
                currentCounter.exceptionCount = 0; //Reset
            }
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
            this._resourceProvider = Constants.StatsbeatResourceProvider.functions;
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
