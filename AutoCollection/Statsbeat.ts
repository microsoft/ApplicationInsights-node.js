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
import Util = require("../Library/Util");

const STATSBEAT_LANGUAGE = "node";

class Statsbeat {

    public static NON_EU_CONNECTION_STRING = "InstrumentationKey=c4a29126-a7cb-47e5-b348-11414998b11e;IngestionEndpoint=https://westus-0.in.applicationinsights.azure.com";
    public static EU_CONNECTION_STRING = "InstrumentationKey=7dc56bab-3c0c-4e9f-9ebb-d1acadee8d0f;IngestionEndpoint=https://westeurope-5.in.applicationinsights.azure.com";
    public static STATS_COLLECTION_SHORT_INTERVAL: number = 900000; // 15 minutes
    public static STATS_COLLECTION_LONG_INTERVAL: number = 86400000; // 1 day

    private static TAG = "Statsbeat";

    private _networkStatsbeatCollection: Array<Network.NetworkStatsbeat>;
    private _sender: Sender;
    private _context: Context;
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

    constructor(config: Config, context?: Context) {
        this._isInitialized = false;
        this._statbeatMetrics = [];
        this._networkStatsbeatCollection = [];
        this._config = config;
        this._context = context || new Context();
        let statsbeatConnectionString = this._getConnectionString(config);
        this._statsbeatConfig = new Config(statsbeatConnectionString);
        this._statsbeatConfig.samplingPercentage = 100; // Do not sample
        this._sender = new Sender(this._statsbeatConfig, null, null, null, null, true, this._shutdownStatsbeat.bind(this));
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
                    this.trackShortIntervalStatsbeats();
                }, Statsbeat.STATS_COLLECTION_SHORT_INTERVAL);
                this._handle.unref(); // Allow the app to terminate even while this loop is going on
            }
            if (!this._longHandle) {
                // On first enablement
                this.trackLongIntervalStatsbeats();
                this._longHandle = setInterval(() => {
                    this.trackLongIntervalStatsbeats();
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

    public countRequest(endpoint: number, host: string, duration: number, success: boolean, statusCode?: number) {
        if (!this.isEnabled()) {
            return;
        }
        let counter: Network.NetworkStatsbeat = this._getNetworkStatsbeatCounter(endpoint, host);
        counter.totalRequestCount++;
        counter.intervalRequestExecutionTime += duration;
        if (success === false) {
            if (!statusCode) {
                return;
            }
            let currentStatusCounter = counter.totalFailedRequestCount.find((statusCounter) => statusCode === statusCounter.statusCode);
            if (currentStatusCounter) {
                currentStatusCounter.count++;
            } else {
                counter.totalFailedRequestCount.push({ statusCode: statusCode, count: 1 });
            }
        }
        else {
            counter.totalSuccesfulRequestCount++;
        }
    }

    public countException(endpoint: number, host: string, exceptionType: Error) {
        if (!this.isEnabled()) {
            return;
        }
        let counter: Network.NetworkStatsbeat = this._getNetworkStatsbeatCounter(endpoint, host);
        let currentErrorCounter = counter.exceptionCount.find((exceptionCounter) => exceptionType.name === exceptionCounter.exceptionType);
        if (currentErrorCounter) {
            currentErrorCounter.count++;
        } else {
            counter.exceptionCount.push({ exceptionType: exceptionType.name, count: 1 });
        }
    }

    public countThrottle(endpoint: number, host: string, statusCode: number) {
        if (!this.isEnabled()) {
            return;
        }
        let counter: Network.NetworkStatsbeat = this._getNetworkStatsbeatCounter(endpoint, host);
        let currentStatusCounter = counter.throttleCount.find((statusCounter) => statusCode === statusCounter.statusCode);
        if (currentStatusCounter) {
            currentStatusCounter.count++;
        } else {
            counter.throttleCount.push({ statusCode: statusCode, count: 1 });
        }
    }

    public countRetry(endpoint: number, host: string, statusCode: number) {
        if (!this.isEnabled()) {
            return;
        }
        let counter: Network.NetworkStatsbeat = this._getNetworkStatsbeatCounter(endpoint, host);
        let currentStatusCounter = counter.retryCount.find((statusCounter) => statusCode === statusCounter.statusCode);
        if (currentStatusCounter) {
            currentStatusCounter.count++;
        } else {
            counter.retryCount.push({ statusCode: statusCode, count: 1 });
        }
    }

    public async trackShortIntervalStatsbeats() {
        try {
            await this._getResourceProvider();
            let networkProperties = {
                "os": this._os,
                "rp": this._resourceProvider,
                "cikey": this._cikey,
                "runtimeVersion": this._runtimeVersion,
                "language": this._language,
                "version": this._sdkVersion,
                "attach": this._attach
            }
            this._trackRequestDuration(networkProperties);
            this._trackRequestsCount(networkProperties);
            await this._sendStatsbeats();
        }
        catch (error) {
            Logging.info(Statsbeat.TAG, "Failed to send Statsbeat metrics: " + Util.dumpObj(error));
        }
    }

    public async trackLongIntervalStatsbeats() {
        try {
            await this._getResourceProvider();
            let commonProperties = {
                "os": this._os,
                "rp": this._resourceProvider,
                "cikey": this._cikey,
                "runtimeVersion": this._runtimeVersion,
                "language": this._language,
                "version": this._sdkVersion,
                "attach": this._attach
            };
            let attachProperties = Object.assign({
                "rpId": this._resourceIdentifier
            }, commonProperties);
            this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.ATTACH, value: 1, properties: attachProperties });
            if (this._instrumentation != Constants.StatsbeatInstrumentation.NONE) {// Only send if there are some instrumentations enabled
                let instrumentationProperties = Object.assign({ "feature": this._instrumentation, "type": Constants.StatsbeatFeatureType.Instrumentation }, commonProperties);
                this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.FEATURE, value: 1, properties: instrumentationProperties });
            }
            if (this._feature != Constants.StatsbeatFeature.NONE) {// Only send if there are some features enabled
                let featureProperties = Object.assign({ "feature": this._feature, "type": Constants.StatsbeatFeatureType.Feature }, commonProperties);
                this._statbeatMetrics.push({ name: Constants.StatsbeatCounter.FEATURE, value: 1, properties: featureProperties });
            }
            await this._sendStatsbeats();
        }
        catch (error) {
            Logging.info(Statsbeat.TAG, "Failed to send Statsbeat metrics: " + Util.dumpObj(error));
        }
    }

    private _getNetworkStatsbeatCounter(endpoint: number, host: string): Network.NetworkStatsbeat {
        let shortHost = this._getShortHost(host);
        // Check if counter is available
        for (let i = 0; i < this._networkStatsbeatCollection.length; i++) {
            // Same object
            if (endpoint === this._networkStatsbeatCollection[i].endpoint &&
                shortHost === this._networkStatsbeatCollection[i].host) {
                return this._networkStatsbeatCollection[i];
            }
        }
        // Create a new one if not found
        let newCounter = new Network.NetworkStatsbeat(endpoint, shortHost);
        this._networkStatsbeatCollection.push(newCounter);
        return newCounter;
    }

    private _trackRequestDuration(commonProperties: {}) {
        for (let i = 0; i < this._networkStatsbeatCollection.length; i++) {
            var currentCounter = this._networkStatsbeatCollection[i];
            currentCounter.time = +new Date;
            var intervalRequests = (currentCounter.totalRequestCount - currentCounter.lastRequestCount) || 0;
            var averageRequestExecutionTime = ((currentCounter.intervalRequestExecutionTime - currentCounter.lastIntervalRequestExecutionTime) / intervalRequests) || 0;
            currentCounter.lastIntervalRequestExecutionTime = currentCounter.intervalRequestExecutionTime; // reset
            if (intervalRequests > 0) {
                // Add extra properties
                let properties = Object.assign(
                    {
                        "endpoint": this._networkStatsbeatCollection[i].endpoint,
                        "host": this._networkStatsbeatCollection[i].host
                    },
                    commonProperties
                );
                this._statbeatMetrics.push({
                    name: Constants.StatsbeatCounter.REQUEST_DURATION,
                    value: averageRequestExecutionTime,
                    properties: properties
                });
            }
            // Set last counters
            currentCounter.lastRequestCount = currentCounter.totalRequestCount;
            currentCounter.lastTime = currentCounter.time;
        }
    }

    private _getShortHost(originalHost: string) {
        let shortHost = originalHost;
        try {
            let hostRegex = new RegExp(/^https?:\/\/(?:www\.)?([^\/.-]+)/);
            let res = hostRegex.exec(originalHost);
            if (res != null && res.length > 1) {
                shortHost = res[1];
            }
            shortHost = shortHost.replace(".in.applicationinsights.azure.com", "");
        }
        catch (error) {
            // Ignore error
        }
        return shortHost;
    }

    private _trackRequestsCount(commonProperties: {}) {
        for (let i = 0; i < this._networkStatsbeatCollection.length; i++) {
            var currentCounter = this._networkStatsbeatCollection[i];
            let properties = Object.assign(
                { "endpoint": currentCounter.endpoint, "host": currentCounter.host },
                commonProperties
            );
            if (currentCounter.totalSuccesfulRequestCount > 0) {
                this._statbeatMetrics.push({
                        name: Constants.StatsbeatCounter.REQUEST_SUCCESS,
                        value: currentCounter.totalSuccesfulRequestCount,
                        properties: properties
                });
                currentCounter.totalSuccesfulRequestCount = 0; //Reset
            }
            if (currentCounter.totalFailedRequestCount.length > 0) {
                currentCounter.totalFailedRequestCount.forEach((currentCounter) => {
                    properties = Object.assign({ ...properties, "statusCode": currentCounter.statusCode });
                    this._statbeatMetrics.push({
                        name: Constants.StatsbeatCounter.REQUEST_FAILURE,
                        value: currentCounter.count,
                        properties: properties
                    });
                });
                currentCounter.totalFailedRequestCount = []; //Reset
            }
            if (currentCounter.retryCount.length > 0) {
                currentCounter.retryCount.forEach((currentCounter) => {
                    properties = Object.assign({ ...properties, "statusCode": currentCounter.statusCode });
                    this._statbeatMetrics.push({
                        name: Constants.StatsbeatCounter.RETRY_COUNT,
                        value: currentCounter.count,
                        properties: properties
                    });
                });
                currentCounter.retryCount = []; //Reset
            }
            if (currentCounter.throttleCount.length > 0) {
                currentCounter.throttleCount.forEach((currentCounter) => {
                    properties = Object.assign({ ...properties, "statusCode": currentCounter.statusCode });
                    this._statbeatMetrics.push({
                        name: Constants.StatsbeatCounter.THROTTLE_COUNT,
                        value: currentCounter.count,
                        properties: properties
                    });
                });
                currentCounter.throttleCount = []; //Reset
            }
            if (currentCounter.exceptionCount.length > 0) {
                currentCounter.exceptionCount.forEach((currentCounter) => {
                    properties = Object.assign({ ...properties, "exceptionType": currentCounter.exceptionType });
                    this._statbeatMetrics.push({
                        name: Constants.StatsbeatCounter.EXCEPTION_COUNT,
                        value: currentCounter.count,
                        properties: properties
                    });
                });
                currentCounter.exceptionCount = []; //Reset
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
            let envelope = EnvelopeFactory.createEnvelope(statsbeat, Contracts.TelemetryType.Metric, null, this._context, this._statsbeatConfig);
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

    private _getResourceProvider(): Promise<void> {
        return new Promise((resolve, reject) => {
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
                        resolve();
                    });
                } else {
                    this._resourceProvider = Constants.StatsbeatResourceProvider.unknown;
                }
            }
            if (!waiting) {
                resolve();
            }
        });
    }

    private _shutdownStatsbeat() {
        this.enable(false);// Disable Statsbeat as is it failed 3 times cosnecutively during initialization, is possible SDK is running in private or restricted network 
    }

    private _getConnectionString(config: Config): string {
        let currentEndpoint = config.endpointUrl;
        let euEndpoints = [
            "westeurope",
            "northeurope",
            "francecentral",
            "francesouth",
            "germanywestcentral",
            "norwayeast",
            "norwaywest",
            "swedencentral",
            "switzerlandnorth",
            "switzerlandwest"
        ];
        for (let i = 0; i < euEndpoints.length; i++) {
            if (currentEndpoint.indexOf(euEndpoints[i]) > -1) {
                return Statsbeat.EU_CONNECTION_STRING;
            }
        }
        return Statsbeat.NON_EU_CONNECTION_STRING;
    }
}

export = Statsbeat;
