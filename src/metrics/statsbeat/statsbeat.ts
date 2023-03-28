import * as os from "os";

import { Logger } from "../../shared/logging";
import {
    CommonStatsbeatProperties,
    NetworkStatsbeat,
    NetworkStatsbeatProperties,
    StatsbeatAttach,
    StatsbeatCounter,
    StatsbeatFeature,
    StatsbeatInstrumentation,
    StatsbeatResourceProvider,
    EU_CONNECTION_STRING,
    EU_ENDPOINTS,
    NON_EU_CONNECTION_STRING,
} from "./types";
import { ApplicationInsightsConfig, AzureVirtualMachine } from "../../shared";
import { Util } from "../../shared/util";
import { IVirtualMachineInfo } from "../../shared/azureVirtualMachine";
import { MeterProvider, PeriodicExportingMetricReader, PeriodicExportingMetricReaderOptions } from "@opentelemetry/sdk-metrics";
import { AzureMonitorExporterOptions, AzureMonitorStatsbeatExporter } from "@azure/monitor-opentelemetry-exporter";
import { BatchObservableResult, Meter, ObservableGauge, ObservableResult } from "@opentelemetry/api-metrics";
import { AZURE_MONITOR_DISTRO_VERSION } from "../../declarations/constants";

const STATSBEAT_LANGUAGE = "node";
const AZURE_MONITOR_STATSBEAT_FEATURES = "AZURE_MONITOR_STATSBEAT_FEATURES";

export class Statsbeat {
    private _commonProperties: CommonStatsbeatProperties;
    private _networkProperties: NetworkStatsbeatProperties;
    private _collectionShortIntervalMs = 900000; // 15 minutes
    private _TAG = "Statsbeat";
    private _networkStatsbeatCollection: Array<NetworkStatsbeat>;
    private _isInitialized: boolean;
    private _config: ApplicationInsightsConfig;
    private _statsbeatConfig: ApplicationInsightsConfig;
    private _isVM: boolean | undefined;
    private _azureVm: AzureVirtualMachine;
    
    private _networkStatsbeatMeter: Meter;
    private _networkStatsbeatMeterProvider: MeterProvider;
    private _networkAzureExporter: AzureMonitorStatsbeatExporter;
    private _networkMetricReader: PeriodicExportingMetricReader;

    // Custom dimensions
    private _resourceProvider: string = StatsbeatResourceProvider.unknown;
    private _sdkVersion: string = AZURE_MONITOR_DISTRO_VERSION;
    private _runtimeVersion: string = process.version;
    private _os: string = os.type();
    private _language: string = STATSBEAT_LANGUAGE;
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

    // Network Attributes
    private _connectionString: string;
    private _endpoint: string;
    private _host: string;

    constructor(config: ApplicationInsightsConfig) {
        this._isInitialized = false;
        this._networkStatsbeatCollection = [];
        this._config = config;
        this._endpoint = this._config.getIngestionEndpoint();
        this._connectionString = this._getConnectionString(this._endpoint);
        this._host = this._getShortHost(this._endpoint);

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

        this._language = STATSBEAT_LANGUAGE;
        this._cikey = this._config.getInstrumentationKey();
        this._os = os.type();
        this._runtimeVersion = process.version;

        this._commonProperties = {
            os: this._os,
            rp: this._resourceProvider,
            cikey: this._cikey,
            runtimeVersion: this._runtimeVersion,
            language: this._language,
            version: this._sdkVersion,
            attach: this._attach,
        };

        this._networkProperties = {
            endpoint: this._endpoint,
            host: this._host
        };

        this._isInitialized = true;
        this._initialize();
    }

    private async _initialize() {
        try {
            await this._getResourceProvider();

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
        if (process.env.WEBSITE_SITE_NAME) {
            // Web apps
            this._resourceProvider = StatsbeatResourceProvider.appsvc;
        } else if (process.env.FUNCTIONS_WORKER_RUNTIME) {
            // Function apps
            this._resourceProvider = StatsbeatResourceProvider.functions;
        } else if (this._config) {
            if (this._isVM === undefined || this._isVM === true) {
                await this._azureVm
                    .getAzureComputeMetadata(this._config)
                    .then((vmInfo: IVirtualMachineInfo) => {
                        this._isVM = vmInfo.isVM;
                        if (this._isVM) {
                            this._resourceProvider = StatsbeatResourceProvider.vm;
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

    public setFeatureStatsbeat() {
        // Set Statsbeat Instrumentations
        if (this._config?.instrumentations?.azureSdk?.enabled) {
            this.addInstrumentation(StatsbeatInstrumentation.AZURE_CORE_TRACING);
        }
        if (this._config?.instrumentations?.mongoDb?.enabled) {
            this.addInstrumentation(StatsbeatInstrumentation.MONGODB);
        }
        if (this._config?.instrumentations?.mySql?.enabled) {
            this.addInstrumentation(StatsbeatInstrumentation.MYSQL);
        }
        if (this._config?.instrumentations?.postgreSql?.enabled) {
            this.addInstrumentation(StatsbeatInstrumentation.POSTGRES);
        }
        if (this._config?.instrumentations?.redis?.enabled) {
            this.addInstrumentation(StatsbeatInstrumentation.REDIS);
        }
        if (this._config?.logInstrumentations?.bunyan?.enabled) {
            this.addInstrumentation(StatsbeatInstrumentation.BUNYAN);
        }
        if (this._config?.logInstrumentations?.winston?.enabled) {
            this.addInstrumentation(StatsbeatInstrumentation.WINSTON);
        }
        if (this._config?.logInstrumentations?.console?.enabled) {
            this.addInstrumentation(StatsbeatInstrumentation.CONSOLE);
        }

        // Set Statsbeat Features
        if (this._config?.aadTokenCredential) {
            this.addFeature(StatsbeatFeature.AAD_HANDLING);
        }
        if (!this._config?.disableOfflineStorage) {
            this.addFeature(StatsbeatFeature.DISK_RETRY);
        }
        this.addFeature(StatsbeatFeature.DISTRO);

        try {
            process.env[AZURE_MONITOR_STATSBEAT_FEATURES] = JSON.stringify({
                instrumentation: this._instrumentation,
                feature: this._feature
            });
        } catch(error) {
            Logger.getInstance().error("Failed call to JSON.stringify.", error);
        }
    }
}
