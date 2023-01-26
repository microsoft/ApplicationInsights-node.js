import * as os from "os";

import { Logger } from "../../shared/logging";
import {
    AttachStatsbeatProperties,
    CommonStatsbeatProperties,
    NetworkStatsbeat,
    NetworkStatsbeatProperties,
    StatsbeatAttach,
    StatsbeatCounter,
    StatsbeatFeature,
    StatsbeatFeatureType,
    StatsbeatInstrumentation,
    StatsbeatResourceProvider,
    EU_CONNECTION_STRING,
    EU_ENDPOINTS,
    NON_EU_CONNECTION_STRING,
} from "./types";
import { ApplicationInsightsConfig, AzureVirtualMachine, ResourceManager } from "../../shared";
import { Util } from "../../shared/util";
import { KnownContextTagKeys } from "../../declarations/generated";
import { IVirtualMachineInfo } from "../../shared/azureVirtualMachine";
import { MeterProvider, PeriodicExportingMetricReader, PeriodicExportingMetricReaderOptions } from "@opentelemetry/sdk-metrics";
import { AzureMonitorExporterOptions, AzureMonitorStatsbeatExporter } from "@azure/monitor-opentelemetry-exporter";
import { BatchObservableResult, Meter, ObservableGauge, ObservableResult } from "@opentelemetry/api-metrics";
import { ExportResult, ExportResultCode } from "@opentelemetry/core";

const STATSBEAT_LANGUAGE = "node";
const AZURE_MONITOR_STATSBEAT_FEATURES = "AZURE_MONITOR_STATSBEAT_FEATURES";

export class Statsbeat {
    private _commonProperties: CommonStatsbeatProperties;
    private _networkProperties: NetworkStatsbeatProperties;
    private _attachProperties: AttachStatsbeatProperties;
    private _collectionShortIntervalMs = 900000; // 15 minutes
    private _collectionLongIntervalMs = 86400000; // 1 day
    private _TAG = "Statsbeat";
    private _networkStatsbeatCollection: Array<NetworkStatsbeat>;
    private _resourceManager: ResourceManager;
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _config: ApplicationInsightsConfig;
    private _statsbeatConfig: ApplicationInsightsConfig;
    private _isVM: boolean | undefined;
    private _azureVm: AzureVirtualMachine;
    
    private _networkStatsbeatMeter: Meter;
    private _networkStatsbeatMeterProvider: MeterProvider;
    private _networkAzureExporter: AzureMonitorStatsbeatExporter;
    private _networkMetricReader: PeriodicExportingMetricReader;

    private _longIntervalStatsbeatMeter: Meter;
    private _longIntervalStatsbeatMeterProvider: MeterProvider;
    private _longIntervalAzureExporter: AzureMonitorStatsbeatExporter;
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
    private _feature: number | undefined = undefined;
    private _instrumentation: number | undefined = undefined;

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
        this._networkStatsbeatCollection = [];
        this._config = config;

        // Only initialize the statsbeat process if not disabled in the user-defined config.
        this._isEnabled = !config.getDisableStatsbeat();
        if (!this._isEnabled) {
            this._getStatsbeatInstrumentations();
            this._getStatsbeatFeatures();
            try {
                process.env[AZURE_MONITOR_STATSBEAT_FEATURES] = JSON.stringify({
                    instrumentation: this._instrumentation,
                    feature: this._feature
                });
            } catch(error) {
                Logger.getInstance().error("Failed call to JSON.stringify.", error);
            }
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

            this._networkStatsbeatMeterProvider = new MeterProvider();

            const exporterConfig: AzureMonitorExporterOptions = {
                connectionString: this._connectionString
            }

            this._networkAzureExporter = new AzureMonitorStatsbeatExporter(exporterConfig);

            // Exports Network Statsbeat every 15 minutes
            const networkMetricReaderOptions: PeriodicExportingMetricReaderOptions = {
                exporter: this._networkAzureExporter,
                exportIntervalMillis: this._collectionShortIntervalMs
            };

            this._networkMetricReader = new PeriodicExportingMetricReader(networkMetricReaderOptions);
            this._networkStatsbeatMeterProvider.addMetricReader(this._networkMetricReader);
            this._networkStatsbeatMeter = this._networkStatsbeatMeterProvider.getMeter("Application Insights Network Statsbeat");

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

            this._longIntervalStatsbeatMeterProvider = new MeterProvider();
            this._longIntervalAzureExporter = new AzureMonitorStatsbeatExporter(exporterConfig);

            // Exports Long Interval Statsbets every day
            const longIntervalMetricReaderOptions: PeriodicExportingMetricReaderOptions = {
                exporter: this._longIntervalAzureExporter,
                exportIntervalMillis: this._collectionLongIntervalMs // 1 day
            };

            this._longIntervalMetricReader = new PeriodicExportingMetricReader(
                longIntervalMetricReaderOptions
            );

            this._longIntervalStatsbeatMeterProvider.addMetricReader(this._longIntervalMetricReader);
            this._longIntervalStatsbeatMeter = this._longIntervalStatsbeatMeterProvider.getMeter("Azure Monitor Long Interval Statsbeat");

            this._featureStatsbeatGauge = this._longIntervalStatsbeatMeter.createObservableGauge(
                StatsbeatCounter.FEATURE
            );
            this._attachStatsbeatGauge = this._longIntervalStatsbeatMeter.createObservableGauge(
                StatsbeatCounter.ATTACH
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

            this._attachProperties = {
                rpId: this._resourceIdentifier
            };

            this._isInitialized = true;
            this._initialize();
        }
    }

    private async _initialize() {
        try {
            this._getResourceProvider();
            this._getCustomProperties();

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
            this._longIntervalStatsbeatMeter.addBatchObservableCallback(this._featureCallback.bind(this), [
                this._featureStatsbeatGauge
            ]);

            // Export Feature/Attach Statsbeat once upon app initialization
            this._longIntervalAzureExporter.export(
                (await this._longIntervalMetricReader.collect()).resourceMetrics,
                (result: ExportResult) => {
                    if (result.code !== ExportResultCode.SUCCESS) {
                        Logger.getInstance().info(
                            this._TAG,
                            `Metrics export failed: ${result.error}`
                        );
                    }
                }
            );
        } catch (error) {
            Logger.getInstance().info(
                this._TAG,
                `Failed to send Statsbeat metrics: ${Util.getInstance().dumpObj(error)}`
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
                { ...attributes }
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
                { ...attributes }
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
                { ...attributes }
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
                { ...attributes }
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
        for (let i = 0; i < this._networkStatsbeatCollection.length; i++) {
            const currentCounter = this._networkStatsbeatCollection[i];
            currentCounter.time = Number(new Date());
            const intervalRequests =
              currentCounter.totalRequestCount - currentCounter.lastRequestCount || 0;
            currentCounter.averageRequestExecutionTime =
              (currentCounter.intervalRequestExecutionTime -
                currentCounter.lastIntervalRequestExecutionTime) /
                intervalRequests || 0;
            currentCounter.lastIntervalRequestExecutionTime = currentCounter.intervalRequestExecutionTime; // reset
      
            currentCounter.lastRequestCount = currentCounter.totalRequestCount;
            currentCounter.lastTime = currentCounter.time;
          }
          observableResult.observe(counter.averageRequestExecutionTime, attributes);
      
          counter.averageRequestExecutionTime = 0;
    }

    private _featureCallback(observableResult: BatchObservableResult) {
        let attributes;
        if (this._instrumentation) {
          attributes = { ...this._commonProperties, feature: this._instrumentation, type: StatsbeatFeatureType.Instrumentation };
          observableResult.observe(this._featureStatsbeatGauge, 1, { ...attributes });
        }
    
        if (this._feature) {
          attributes = { ...this._commonProperties, feature: this._feature, type: StatsbeatFeatureType.Feature };
          observableResult.observe(this._featureStatsbeatGauge, 1, { ...attributes });
        }
    }

    private _attachCallback(observableResult: ObservableResult) {
        const attributes = { ...this._commonProperties, ...this._attachProperties };
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

    private _getStatsbeatInstrumentations() {
        if (this._config?.instrumentations?.azureSdk?.enabled) {
            this._addInstrumentation(StatsbeatInstrumentation.AZURE_CORE_TRACING);
        }
        if (this._config?.instrumentations?.mongoDb?.enabled) {
            this._addInstrumentation(StatsbeatInstrumentation.MONGODB);
        }
        if (this._config?.instrumentations?.mySql?.enabled) {
            this._addInstrumentation(StatsbeatInstrumentation.MYSQL);
        }
        if (this._config?.instrumentations?.postgreSql?.enabled) {
            this._addInstrumentation(StatsbeatInstrumentation.POSTGRES);
        }
        if (this._config?.instrumentations?.redis?.enabled) {
            this._addInstrumentation(StatsbeatInstrumentation.REDIS);
        }
    }

    private _getStatsbeatFeatures() {
        if (this._config?.aadTokenCredential) {
            this._addFeature(StatsbeatFeature.AAD_HANDLING);
        }
        if (!this._config?.disableOfflineStorage) {
            this._addFeature(StatsbeatFeature.DISK_RETRY);
        }
        this._addFeature(StatsbeatFeature.DISTRO);
    }

    private _addFeature(feature: number) {
        this._feature |= feature;
    }
    
    private _addInstrumentation(instrumentation: number) {
        this._instrumentation |= instrumentation;
    }
}
