import * as os from "os";
import {
    Meter,
    ObservableGauge,
    BatchObservableResult,
    ObservableResult
} from "@opentelemetry/api-metrics";
import {
    MeterProvider,
    PeriodicExportingMetricReader,
    PeriodicExportingMetricReaderOptions
} from "@opentelemetry/sdk-metrics";

import { Logger } from "../../../library/logging";
import {
    EU_CONNECTION_STRING,
    EU_ENDPOINTS,
    NON_EU_CONNECTION_STRING,
    StatsbeatAttach,
    StatsbeatCounter,
    StatsbeatFeature,
    StatsbeatFeatureType,
    StatsbeatInstrumentation,
    StatsbeatResourceProvider
} from "../../../declarations/constants";
import { Config } from "../../../library/configuration";
import { AzureVirtualMachine } from "../../../library";
import { NetworkStatsbeat, CommonStatsbeatProperties, NetworkStatsbeatProperties } from "./types";
import { Util } from "../../../library/util";
import { ResourceManager } from "../../../library/handlers";
import { KnownContextTagKeys } from "../../../declarations/generated";
import { IVirtualMachineInfo } from "../../../library/azureVirtualMachine";
import {
    AzureMonitorExporterOptions,
    AzureMonitorMetricExporter
} from "@azure/monitor-opentelemetry-exporter";

const STATSBEAT_LANGUAGE = "node";

export class Statsbeat {
    private _commonProperties: CommonStatsbeatProperties;
    private _networkProperties: NetworkStatsbeatProperties;
    private _collectionShortIntervalMs: number = 900000; // 15 minutes
    private _collectionLongIntervalMs: number = 86400000; // 1 day
    private _TAG = "Statsbeat";
    private _networkStatsbeatCollection: Array<NetworkStatsbeat>;
    private _resourceManager: ResourceManager;
    private _handle: NodeJS.Timer | null;
    private _longHandle: NodeJS.Timer | null;
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _config: Config;
    private _statsbeatConfig: Config;
    private _isVM: boolean | undefined;
    private _statbeatMetrics: Array<{ name: string; value: number; properties: {} }>;
    private _azureVm: AzureVirtualMachine;
    private _meter: Meter;
    private _meterProvider: MeterProvider;
    private _azureExporter: AzureMonitorMetricExporter;
    private _metricReader: PeriodicExportingMetricReader;

    // Custom dimensions
    private _resourceProvider: string;
    private _resourceIdentifier: string;
    private _sdkVersion: string;
    private _runtimeVersion: string;
    private _os: string;
    private _language: string;
    private _cikey: string;
    private _attach: string = StatsbeatAttach.sdk; // Default is SDK
    private _feature: number = StatsbeatFeature.NONE;
    private _instrumentation: number = StatsbeatInstrumentation.NONE;

    // Observable Gauges
    private _successCountGauge: ObservableGauge;
    private _failureCountGauge: ObservableGauge;
    private _retryCountGauge: ObservableGauge;
    private _throttleCountGauge: ObservableGauge;
    private _exceptionCountGauge: ObservableGauge;
    private _averageDurationGauge: ObservableGauge;

    // Network attributes
    private _connectionString: string;
    private _endpoint: string;
    private _host: string;

    constructor(config: Config, resourceManager?: ResourceManager) {
        this._isInitialized = false;
        this._statbeatMetrics = [];
        this._networkStatsbeatCollection = [];
        this._config = config;
        this._endpoint = this._config.endpointUrl;
        this._connectionString = this._getConnectionString(config.endpointUrl);
        this._host = this._getShortHost(this._endpoint);

        this._resourceManager = resourceManager || new ResourceManager();
        this._azureVm = new AzureVirtualMachine();
        this._statsbeatConfig = new Config(this._connectionString);
        this._statsbeatConfig.enableAutoCollectHeartbeat = false;
        this._statsbeatConfig.enableAutoCollectPerformance = false;
        this._statsbeatConfig.enableAutoCollectPreAggregatedMetrics = false;
        this._statsbeatConfig.enableAutoCollectConsole = false;

        this._meterProvider = new MeterProvider();
        this._successCountGauge = this._meter.createObservableGauge(
            StatsbeatCounter.REQUEST_SUCCESS
        );
        this._failureCountGauge = this._meter.createObservableGauge(
            StatsbeatCounter.REQUEST_FAILURE
        );
        this._retryCountGauge = this._meter.createObservableGauge(StatsbeatCounter.RETRY_COUNT);
        this._throttleCountGauge = this._meter.createObservableGauge(
            StatsbeatCounter.THROTTLE_COUNT
        );
        this._exceptionCountGauge = this._meter.createObservableGauge(
            StatsbeatCounter.EXCEPTION_COUNT
        );
        this._averageDurationGauge = this._meter.createObservableGauge(
            StatsbeatCounter.REQUEST_DURATION
        );

        this._commonProperties = {
            os: this._os,
            rp: this._resourceProvider,
            cikey: this._cikey,
            runtimeVersion: this._runtimeVersion,
            language: this._language,
            version: this._sdkVersion,
            attach: this._attach
        };

        this._networkProperties = {
            endpoint: this._endpoint,
            host: this._host
        };

        const exporterConfig: AzureMonitorExporterOptions = {
            connectionString: this._connectionString
        };

        this._azureExporter = new AzureMonitorMetricExporter(exporterConfig);
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
                }, this._collectionShortIntervalMs);
                this._handle.unref(); // Allow the app to terminate even while this loop is going on
            }
            if (!this._longHandle) {
                // On first enablement
                this.trackLongIntervalStatsbeats();
                this._longHandle = setInterval(() => {
                    this.trackLongIntervalStatsbeats();
                }, this._collectionLongIntervalMs);
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
        this._attach = StatsbeatAttach.codeless;
    }

    public addFeature(feature: StatsbeatFeature) {
        this._feature |= feature;
    }

    public removeFeature(feature: StatsbeatFeature) {
        this._feature &= ~feature;
    }

    public addInstrumentation(instrumentation: StatsbeatInstrumentation) {
        this._instrumentation |= instrumentation;
    }

    public removeInstrumentation(instrumentation: StatsbeatInstrumentation) {
        this._instrumentation &= ~instrumentation;
    }

    // Observable gauge callbacks
    private _successCallback(observableResult: ObservableResult) {
        let counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(
            this._endpoint,
            this._host
        );
        let attributes = { ...this._commonProperties, ...this._networkProperties };
        observableResult.observe(counter.totalSuccesfulRequestCount, attributes);
        counter.totalSuccesfulRequestCount = 0;
    }

    private _failureCallback(observableResult: BatchObservableResult) {
        let counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(
            this._endpoint,
            this._host
        );
        let attributes = { ...this._commonProperties, ...this._networkProperties, statusCode: 0 };

        for (let i = 0; i < counter.totalFailedRequestCount.length; i++) {
            attributes.statusCode = counter.totalFailedRequestCount[i].statusCode;
            observableResult.observe(
                this._failureCountGauge,
                counter.totalFailedRequestCount[i].count,
                attributes
            );
            counter.totalFailedRequestCount[i].count = 0;
        }
    }

    private _retryCallback(observableResult: BatchObservableResult) {
        let counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(
            this._endpoint,
            this._host
        );
        let attributes = { ...this._networkProperties, ...this._commonProperties, statusCode: 0 };

        for (let i = 0; i < counter.retryCount.length; i++) {
            attributes.statusCode = counter.retryCount[i].statusCode;
            observableResult.observe(
                this._retryCountGauge,
                counter.retryCount[i].count,
                attributes
            );
            counter.retryCount[i].count = 0;
        }
    }

    private _throttleCallback(observableResult: BatchObservableResult) {
        let counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(
            this._endpoint,
            this._host
        );
        let attributes = { ...this._networkProperties, ...this._commonProperties, statusCode: 0 };

        for (let i = 0; i < counter.throttleCount.length; i++) {
            attributes.statusCode = counter.throttleCount[i].statusCode;
            observableResult.observe(
                this._throttleCountGauge,
                counter.throttleCount[i].count,
                attributes
            );
            counter.throttleCount[i].count = 0;
        }
    }

    private _exceptionCallback(observableResult: BatchObservableResult) {
        let counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(
            this._endpoint,
            this._host
        );
        let attributes = {
            ...this._networkProperties,
            ...this._commonProperties,
            exceptionType: ""
        };

        for (let i = 0; i < counter.exceptionCount.length; i++) {
            attributes.exceptionType = counter.exceptionCount[i].exceptionType;
            observableResult.observe(
                this._exceptionCountGauge,
                counter.exceptionCount[i].count,
                attributes
            );
            counter.exceptionCount[i].count = 0;
        }
    }

    private _durationCallback(observableResult: ObservableResult) {
        let counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(
            this._endpoint,
            this._host
        );
        let attributes = { ...this._networkProperties, ...this._commonProperties };
        observableResult.observe(counter.averageRequestExecutionTime, attributes);
        counter.averageRequestExecutionTime = 0;
    }

    // TOOD: Export the feature statsbeat here.
    private _featureCallback(observableResult: ObservableResult) {

    }

    // TOOD: Export the attach statsbeat here.
    private _attachCallback(observableResult: ObservableResult) {
        
    }

    // Public methods to increase counters
    public countSuccess(duration: number) {
        if (!this.isEnabled()) {
            return;
        }
        let counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(
            this._endpoint,
            this._host
        );
        counter.totalRequestCount++;
        counter.totalSuccesfulRequestCount++;
        counter.intervalRequestExecutionTime += duration;
    }

    public countFailure(duration: number, statusCode: number) {
        if (!this._isInitialized) {
            return;
        }
        let counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(
            this._endpoint,
            this._host
        );
        let currentStatusCounter = counter.totalFailedRequestCount.find(
            (statusCounter) => statusCode === statusCounter.statusCode
        );

        if (currentStatusCounter) {
            currentStatusCounter.count++;
        } else {
            counter.totalFailedRequestCount.push({ statusCode: statusCode, count: 1 });
        }

        counter.totalRequestCount++;
        counter.intervalRequestExecutionTime += duration;
    }

    public countException(exceptionType: Error) {
        if (!this.isEnabled()) {
            return;
        }
        let counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(
            this._endpoint,
            this._host
        );
        let currentErrorCounter = counter.exceptionCount.find(
            (exceptionCounter) => exceptionType.name === exceptionCounter.exceptionType
        );
        if (currentErrorCounter) {
            currentErrorCounter.count++;
        } else {
            counter.exceptionCount.push({ exceptionType: exceptionType.name, count: 1 });
        }
    }

    public countThrottle(statusCode: number) {
        if (!this.isEnabled()) {
            return;
        }
        let counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(
            this._endpoint,
            this._host
        );
        let currentStatusCounter = counter.throttleCount.find(
            (statusCounter) => statusCode === statusCounter.statusCode
        );

        if (currentStatusCounter) {
            currentStatusCounter.count++;
        } else {
            counter.throttleCount.push({ statusCode: statusCode, count: 1 });
        }
    }

    public countRetry(statusCode: number) {
        if (!this.isEnabled()) {
            return;
        }
        let counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(
            this._endpoint,
            this._host
        );
        let currentStatusCounter = counter.retryCount.find(
            (statusCounter) => statusCode === statusCounter.statusCode
        );

        if (currentStatusCounter) {
            currentStatusCounter.count++;
        } else {
            counter.retryCount.push({ statusCode: statusCode, count: 1 });
        }
    }

    public async trackShortIntervalStatsbeats() {
        const metricReaderOptions: PeriodicExportingMetricReaderOptions = {
            exporter: this._azureExporter,
            exportIntervalMillis: this._collectionShortIntervalMs
        };

        try {
            await this._getResourceProvider();
            // Add observable callbacks
            this._successCountGauge.addCallback(this._successCallback.bind(this));
            this._meter.addBatchObservableCallback(this._failureCallback.bind(this), [
                this._failureCountGauge
            ]);
            this._meter.addBatchObservableCallback(this._retryCallback.bind(this), [
                this._retryCountGauge
            ]);
            this._meter.addBatchObservableCallback(this._throttleCallback.bind(this), [
                this._throttleCountGauge
            ]);
            this._meter.addBatchObservableCallback(this._exceptionCallback.bind(this), [
                this._exceptionCountGauge
            ]);
            this._averageDurationGauge.addCallback(this._durationCallback.bind(this));
            this._commonProperties = {
                os: this._os,
                rp: this._resourceProvider,
                cikey: this._cikey,
                runtimeVersion: this._runtimeVersion,
                language: this._language,
                version: this._sdkVersion,
                attach: this._attach
            };

            // Dont use this send Statsbeats method anymore and instead call the PeriodicExporter here.
            // Exports Network Statsbeat every 15 minutes
            this._metricReader = new PeriodicExportingMetricReader(metricReaderOptions);
            this._meterProvider.addMetricReader(this._metricReader);
            this._meter = this._meterProvider.getMeter("Application Insights NetworkStatsbeat");
        } catch (error) {
            Logger.getInstance().info(
                this._TAG,
                "Failed to send Statsbeat metrics: " + Util.getInstance().dumpObj(error)
            );
        }
    }

    public async trackLongIntervalStatsbeats() {
        try {
            await this._getResourceProvider();
            let commonProperties = {
                os: this._os,
                rp: this._resourceProvider,
                cikey: this._cikey,
                runtimeVersion: this._runtimeVersion,
                language: this._language,
                version: this._sdkVersion,
                attach: this._attach
            };
            let attachProperties = Object.assign(
                {
                    rpId: this._resourceIdentifier
                },
                commonProperties
            );
            this._statbeatMetrics.push({
                name: StatsbeatCounter.ATTACH,
                value: 1,
                properties: attachProperties
            });
            if (this._instrumentation != StatsbeatInstrumentation.NONE) {
                // Only send if there are some instrumentations enabled
                let instrumentationProperties = Object.assign(
                    {
                        feature: this._instrumentation,
                        type: StatsbeatFeatureType.Instrumentation
                    },
                    commonProperties
                );
                this._statbeatMetrics.push({
                    name: StatsbeatCounter.FEATURE,
                    value: 1,
                    properties: instrumentationProperties
                });
            }
            if (this._feature != StatsbeatFeature.NONE) {
                // Only send if there are some features enabled
                let featureProperties = Object.assign(
                    { feature: this._feature, type: StatsbeatFeatureType.Feature },
                    commonProperties
                );
                this._statbeatMetrics.push({
                    name: StatsbeatCounter.FEATURE,
                    value: 1,
                    properties: featureProperties
                });
            }
        } catch (error) {
            Logger.getInstance().info(
                this._TAG,
                "Failed to send Statsbeat metrics: " + Util.getInstance().dumpObj(error)
            );
        }
    }

    private _getNetworkStatsbeatCounter(endpoint: string, host: string): NetworkStatsbeat {
        // Check if counter is available
        for (let i = 0; i < this._networkStatsbeatCollection.length; i++) {
            // Same object
            if (
                endpoint === this._networkStatsbeatCollection[i].endpoint &&
                host === this._networkStatsbeatCollection[i].host
            ) {
                return this._networkStatsbeatCollection[i];
            }
        }
        // Create a new one if not found
        let newCounter = new NetworkStatsbeat(endpoint, host);
        this._networkStatsbeatCollection.push(newCounter);
        return newCounter;
    }

    public countAverageDuration() {
        for (let i = 0; i < this._networkStatsbeatCollection.length; i++) {
            let currentCounter = this._networkStatsbeatCollection[i];
            currentCounter.time = Number(new Date());
            let intervalRequests =
                currentCounter.totalRequestCount - currentCounter.lastRequestCount || 0;
            currentCounter.averageRequestExecutionTime =
                (currentCounter.intervalRequestExecutionTime -
                    currentCounter.lastIntervalRequestExecutionTime) /
                    intervalRequests || 0;
            currentCounter.lastIntervalRequestExecutionTime =
                currentCounter.intervalRequestExecutionTime; // reset

            currentCounter.lastRequestCount = currentCounter.totalRequestCount;
            currentCounter.lastTime = currentCounter.time;
        }
    }

    private _getCustomProperties() {
        this._language = STATSBEAT_LANGUAGE;
        this._cikey = this._config.instrumentationKey;
        const sdkVersion =
            String(
                this._resourceManager.getTraceResource().attributes[
                    KnownContextTagKeys.AiInternalSdkVersion
                ]
            ) || null;
        this._sdkVersion = sdkVersion; // "node" or "node-nativeperf"
        this._os = os.type();
        this._runtimeVersion = process.version;
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
        } catch (error) {
            Logger.getInstance().info(
                this._TAG,
                "Failed to get the short host name: " + Util.getInstance().dumpObj(error)
            );
        }
        return shortHost;
    }

    private _getConnectionString(endpointUrl: string) {
        let currentEndpoint = endpointUrl;
        for (let i = 0; i < EU_ENDPOINTS.length; i++) {
          if (currentEndpoint.includes(EU_ENDPOINTS[i])) {
            return EU_CONNECTION_STRING;
          }
        }
        return NON_EU_CONNECTION_STRING;
    }

    private async _getResourceProvider(): Promise<void> {
        // Check resource provider
        this._resourceProvider = StatsbeatResourceProvider.unknown;
        this._resourceIdentifier = StatsbeatResourceProvider.unknown;
        if (process.env.WEBSITE_SITE_NAME) {
            // Web apps
            this._resourceProvider = StatsbeatResourceProvider.appsvc;
            this._resourceIdentifier = process.env.WEBSITE_SITE_NAME;
            if (process.env.WEBSITE_HOME_STAMPNAME) {
                this._resourceIdentifier += "/" + process.env.WEBSITE_HOME_STAMPNAME;
            }
        } else if (process.env.FUNCTIONS_WORKER_RUNTIME) {
            // Function apps
            this._resourceProvider = StatsbeatResourceProvider.functions;
            if (process.env.WEBSITE_HOSTNAME) {
                this._resourceIdentifier = process.env.WEBSITE_HOSTNAME;
            }
        } else if (this._config) {
            if (this._isVM === undefined || this._isVM == true) {
                await this._azureVm
                    .getAzureComputeMetadata(this._config)
                    .then((vmInfo: IVirtualMachineInfo) => {
                        this._isVM = vmInfo.isVM;
                        if (this._isVM) {
                            this._resourceProvider = StatsbeatResourceProvider.vm;
                            this._resourceIdentifier = vmInfo.id + "/" + vmInfo.subscriptionId;
                            // Override OS as VM info have higher precedence
                            if (vmInfo.osType) {
                                this._os = vmInfo.osType;
                            }
                        }
                    })
                    .catch((error) => Logger.getInstance().debug(error));
            } else {
                this._resourceProvider = StatsbeatResourceProvider.unknown;
            }
        }
    }
}
