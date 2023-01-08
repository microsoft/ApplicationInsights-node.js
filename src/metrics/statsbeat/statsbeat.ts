import * as os from "os";

import { Logger } from "../../shared/logging";
import {
    CommonStatsbeatProperties,
    NetworkStatsbeat,
    NetworkStatsbeatProperties,
    StatsbeatAttach,
    StatsbeatCounter,
    StatsbeatFeature,
    StatsbeatFeatureType,
    StatsbeatInstrumentation,
    StatsbeatResourceProvider,
} from "./types";
import { ApplicationInsightsConfig, AzureVirtualMachine, ResourceManager } from "../../shared";
import { Util } from "../../shared/util";
import { MetricTelemetry, MetricPointTelemetry } from "../../declarations/contracts";
import { KnownContextTagKeys } from "../../declarations/generated";
import { IVirtualMachineInfo } from "../../shared/azureVirtualMachine";
import { MeterProvider, PeriodicExportingMetricReader, PeriodicExportingMetricReaderOptions } from "@opentelemetry/sdk-metrics";
import { AzureMonitorExporterOptions, AzureMonitorStatsbeatExporter } from "@azure/monitor-opentelemetry-exporter";
import { BatchObservableResult, Meter, ObservableGauge, ObservableResult } from "@opentelemetry/api-metrics";
import { EU_CONNECTION_STRING, EU_ENDPOINTS, NON_EU_CONNECTION_STRING } from "../../declarations/constants";

const STATSBEAT_LANGUAGE = "node";

export class Statsbeat {
    private _commonProperties: CommonStatsbeatProperties;
    private _networkProperties: NetworkStatsbeatProperties;
    // TODO: Determine what this old connection string was used for. Was this before we had region specific connectionStrings?
    // private _connectionString = "InstrumentationKey=c4a29126-a7cb-47e5-b348-11414998b11e;IngestionEndpoint=https://dc.services.visualstudio.com/";
    // TODO: Change these to production times.
    private _collectionShortIntervalMs = 1000; // 15 minutes
    private _collectionLongIntervalMs = 5000; // 1 day
    private _TAG = "Statsbeat";
    private _networkStatsbeatCollection: Array<NetworkStatsbeat>;
    private _resourceManager: ResourceManager;
    private _handle: NodeJS.Timer | null;
    private _longHandle: NodeJS.Timer | null;
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _config: ApplicationInsightsConfig;
    private _statsbeatConfig: ApplicationInsightsConfig;
    private _isVM: boolean | undefined;
    private _statbeatMetrics: Array<{ name: string; value: number; properties: unknown }>;
    private _azureVm: AzureVirtualMachine;
    
    private _networkStatsbeatMeter: Meter;
    private _longIntervalStatsbeatMeter: Meter;
    private _meterProvider: MeterProvider;
    private _azureExporter: AzureMonitorStatsbeatExporter;
    private _networkMetricReader: PeriodicExportingMetricReader;
    private _longIntervalMetricReader: PeriodicExportingMetricReader;

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
    private _featureStatsbeatGauge: ObservableGauge;
    private _attachStatsbeatGauge: ObservableGauge;

    // Network Attributes
    private _connectionString: string;
    private _endpoint: string;
    private _host: string;

    constructor(config: ApplicationInsightsConfig, resourceManager?: ResourceManager) {
        this._isInitialized = false;
        this._statbeatMetrics = [];
        this._networkStatsbeatCollection = [];
        this._config = config;

        // Only initialize the statsbeat process if not disabled in the user-defined config.
        this._isEnabled = !config.getDisableStatsbeat();
        if (!this._isEnabled) {
            // TODO: Figure out why endpoint doesn't exist on config. I think this will get the proper endpointUrl.
            this._endpoint = this._config.getIngestionEndpoint();
            this._connectionString = this._getConnectionString(this._endpoint);
            this._host = this._getShortHost(this._endpoint);

            this._resourceManager = resourceManager || new ResourceManager();
            this._azureVm = new AzureVirtualMachine();
            this._statsbeatConfig = new ApplicationInsightsConfig();
            this._statsbeatConfig.connectionString = this._connectionString;
            this._statsbeatConfig.enableAutoCollectHeartbeat = false;
            this._statsbeatConfig.enableAutoCollectPerformance = false;
            this._statsbeatConfig.enableAutoCollectStandardMetrics = false;

            this._meterProvider = new MeterProvider();

            // Exports Network Statsbeat every 15 minutes
            const metricReaderOptions: PeriodicExportingMetricReaderOptions = {
                exporter: this._azureExporter,
                exportIntervalMillis: this._collectionShortIntervalMs
            };

            this._networkMetricReader = new PeriodicExportingMetricReader(metricReaderOptions);
            this._meterProvider.addMetricReader(this._networkMetricReader);
            this._networkStatsbeatMeter = this._meterProvider.getMeter("Application Insights Network Statsbeat");

            this._successCountGauge = this._networkStatsbeatMeter.createObservableGauge(
                StatsbeatCounter.REQUEST_SUCCESS
            );
            this._failureCountGauge = this._networkStatsbeatMeter.createObservableGauge(
                StatsbeatCounter.REQUEST_FAILURE
            );
            this._retryCountGauge = this._networkStatsbeatMeter.createObservableGauge(StatsbeatCounter.RETRY_COUNT);
            this._throttleCountGauge = this._networkStatsbeatMeter.createObservableGauge(
                StatsbeatCounter.THROTTLE_COUNT
            );
            this._exceptionCountGauge = this._networkStatsbeatMeter.createObservableGauge(
                StatsbeatCounter.EXCEPTION_COUNT
            );
            this._averageDurationGauge = this._networkStatsbeatMeter.createObservableGauge(
                StatsbeatCounter.REQUEST_DURATION
            );

            // Exports Long Interval Statsbets every day
            const longIntervalMetricReaderOptions: PeriodicExportingMetricReaderOptions = {
                exporter: this._azureExporter,
                // TODO: Get this to export once immmediately and once when statstbeat starts up.
                exportIntervalMillis: this._collectionLongIntervalMs
            };

            this._longIntervalMetricReader = new PeriodicExportingMetricReader(
                longIntervalMetricReaderOptions
            );

            this._meterProvider.addMetricReader(this._longIntervalMetricReader);
            this._longIntervalStatsbeatMeter = this._meterProvider.getMeter("Azure Monitor Long Interval Statsbeat");


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

            this._azureExporter = new AzureMonitorStatsbeatExporter(exporterConfig);
            this._isInitialized = true;
            this._initialize();
        }
    }

    private async _initialize() {
        try {
            this._getResourceProvider();

            // Add network observable callbacks
            this._successCountGauge.addCallback(this._successCallback.bind(this));
            this._networkStatsbeatMeter.addBatchObservableCallback(this._failureCallback.bind(this), [
                this._failureCountGauge
            ]);
            this._networkStatsbeatMeter.addBatchObservableCallback(this._retryCallback.bind(this), [
                this._retryCountGauge
            ]);
            this._networkStatsbeatMeter.addBatchObservableCallback(this._throttleCallback.bind(this), [
                this._throttleCountGauge
            ]);
            this._networkStatsbeatMeter.addBatchObservableCallback(this._exceptionCallback.bind(this), [
                this._exceptionCountGauge
            ]);
            this._averageDurationGauge.addCallback(this._durationCallback.bind(this));

            // Add long interval observable callbacks
            this._attachStatsbeatGauge.addCallback(this._attachCallback.bind(this));
            this._featureStatsbeatGauge.addCallback(this._featureCallback.bind(this));
        } catch (error) {
            Logger.getInstance().info(
                this._TAG,
                `"Failed to send Statsbeat metrics: " ${Util.getInstance().dumpObj(error)}`
            );
        }
    }

    public isInitialized() {
        return this._isInitialized;
    }

    // Observable gauge callbacks
    private _successCallback(observableResult: ObservableResult) {
        const counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(
            this._endpoint,
            this._host
        );
        const attributes = { ...this._commonProperties, ...this._networkProperties };
        observableResult.observe(counter.totalSuccesfulRequestCount, attributes);
        counter.totalSuccesfulRequestCount = 0;
    }

    private _failureCallback(observableResult: BatchObservableResult) {
        const counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(
            this._endpoint,
            this._host
        );
        const attributes = { ...this._commonProperties, ...this._networkProperties, statusCode: 0 };

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
        const counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(
            this._endpoint,
            this._host
        );
        const attributes = { ...this._networkProperties, ...this._commonProperties, statusCode: 0 };

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
        const counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(
            this._endpoint,
            this._host
        );
        const attributes = { ...this._networkProperties, ...this._commonProperties, statusCode: 0 };

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
        const counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(
            this._endpoint,
            this._host
        );
        const attributes = {
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
        const counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(
            this._endpoint,
            this._host
        );
        const attributes = { ...this._networkProperties, ...this._commonProperties };
        observableResult.observe(counter.averageRequestExecutionTime, attributes);
        counter.averageRequestExecutionTime = 0;
    }

    private _featureCallback(observableResult: ObservableResult) {
        if (this._feature !== StatsbeatFeature.NONE) {
            const attributes = { feature: this._feature, type: StatsbeatFeatureType.Feature, ...this._commonProperties }
            observableResult.observe(1, attributes);
        }
    }

    private _attachCallback(observableResult: ObservableResult) {
        const attributes = { rpId: this._resourceIdentifier, ...this._commonProperties };
        observableResult.observe(1, attributes);
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

    public countSuccess(duration: number) {
        if (!this.isEnabled()) {
            return;
        }
        const counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(this._endpoint, this._host);
        counter.totalRequestCount++;
        counter.totalSuccesfulRequestCount++;
        counter.intervalRequestExecutionTime += duration;
    }

    public countFailure(duration: number, statusCode: number) {
        if (!this._isInitialized) {
            return;
        }
        const counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(this._endpoint, this._host);
        const currentStatusCounter = counter.totalFailedRequestCount.find(
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
        const counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(this._endpoint, this._host);
        const currentErrorCounter = counter.exceptionCount.find(
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
        const counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(this._endpoint, this._host);
        const currentStatusCounter = counter.throttleCount.find(
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
        const counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(this._endpoint, this._host);
        const currentStatusCounter = counter.retryCount.find(
            (statuscounter) => statusCode === statuscounter.statusCode
        );

        if (currentStatusCounter) {
            currentStatusCounter.count++;
        } else {
            counter.retryCount.push({ statusCode: statusCode, count: 1 });
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
        const newCounter = new NetworkStatsbeat(endpoint, host);
        this._networkStatsbeatCollection.push(newCounter);
        return newCounter;
    }

    // TODO: Ensure we apply the negative average statsbeat fix to this if necessary.
    public countAverageDuration() {
        for (let i = 0; i < this._networkStatsbeatCollection.length; i++) {
            const currentCounter = this._networkStatsbeatCollection[i];
            currentCounter.time = +new Date();
            const intervalRequests = (currentCounter.totalRequestCount - currentCounter.lastRequestCount) || 0;
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
        this._cikey = this._config.getInstrumentationKey();
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
            const hostRegex = new RegExp(/^https?:\/\/(?:www\.)?([^\/.-]+)/);
            const res = hostRegex.exec(originalHost);
            if (res !== null && res.length > 1) {
                shortHost = res[1];
            }
            shortHost = shortHost.replace(".in.applicationinsights.azure.com", "");
        } catch (error) {
            Logger.getInstance().info(
                this._TAG,
                `"Failed to get the short host name: " ${Util.getInstance().dumpObj(error)}`
            );
        }
        return shortHost;
    }

    private _getConnectionString(endpoint: string) {
        for (let i = 0; i < EU_ENDPOINTS.length; i++) {
            if (endpoint.includes(EU_ENDPOINTS[i])) {
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
                this._resourceIdentifier += `/${process.env.WEBSITE_HOME_STAMPNAME}`;
            }
        } else if (process.env.FUNCTIONS_WORKER_RUNTIME) {
            // Function apps
            this._resourceProvider = StatsbeatResourceProvider.functions;
            if (process.env.WEBSITE_HOSTNAME) {
                this._resourceIdentifier = process.env.WEBSITE_HOSTNAME;
            }
        } else if (this._config) {
            if (this._isVM === undefined || this._isVM === true) {
                await this._azureVm
                    .getAzureComputeMetadata(this._config)
                    .then((vmInfo: IVirtualMachineInfo) => {
                        this._isVM = vmInfo.isVM;
                        if (this._isVM) {
                            this._resourceProvider = StatsbeatResourceProvider.vm;
                            this._resourceIdentifier = `${vmInfo.id}/${vmInfo.subscriptionId}`;
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
