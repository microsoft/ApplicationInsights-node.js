import * as os from "os";
import { Meter, ObservableGauge } from "@opentelemetry/api-metrics";
import { MeterProvider } from "@opentelemetry/sdk-metrics";

import { Logger } from "../../../library/logging";
import {
    StatsbeatAttach,
    StatsbeatCounter,
    StatsbeatFeature,
    StatsbeatFeatureType,
    StatsbeatInstrumentation,
    StatsbeatResourceProvider
} from "../../../declarations/constants";
import { Config } from "../../../library/configuration";
import { AzureVirtualMachine } from "../../../library";
import { NetworkStatsbeat } from "./types";
import { Util } from "../../../library/util";
import { MetricHandler, ResourceManager } from "../../../library/handlers";
import { MetricTelemetry, MetricPointTelemetry } from "../../../declarations/contracts";
import { KnownContextTagKeys } from "../../../declarations/generated";
import { IVirtualMachineInfo } from "../../../library/azureVirtualMachine";

const STATSBEAT_LANGUAGE = "node";


export class Statsbeat {
    private _connectionString =
        "InstrumentationKey=c4a29126-a7cb-47e5-b348-11414998b11e;IngestionEndpoint=https://dc.services.visualstudio.com/";
    private _collectionShortIntervalMs: number = 900000; // 15 minutes
    private _collectionLongIntervalMs: number = 1440000; // 1 day
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

    constructor(config: Config, resourceManager?: ResourceManager) {
        this._isInitialized = false;
        this._statbeatMetrics = [];
        this._networkStatsbeatCollection = [];
        this._config = config;
        this._resourceManager = resourceManager || new ResourceManager();
        this._azureVm = new AzureVirtualMachine();
        this._statsbeatConfig = new Config(this._connectionString);
        this._statsbeatConfig.samplingPercentage = 100; // Do not sample
        this._statsbeatConfig.enableAutoCollectHeartbeat = false;
        this._statsbeatConfig.enableAutoCollectPerformance = false;
        this._statsbeatConfig.enableAutoCollectPreAggregatedMetrics = false;
        this._statsbeatConfig.enableAutoCollectConsole = false;
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

    public countRequest(endpoint: number, host: string, duration: number, success: boolean) {
        if (!this.isEnabled()) {
            return;
        }
        let counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(endpoint, host);
        counter.totalRequestCount++;
        counter.intervalRequestExecutionTime += duration;
        if (success === false) {
            counter.totalFailedRequestCount++;
        } else {
            counter.totalSuccesfulRequestCount++;
        }
    }

    public countException(endpoint: number, host: string) {
        if (!this.isEnabled()) {
            return;
        }
        let counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(endpoint, host);
        counter.exceptionCount++;
    }

    public countThrottle(endpoint: number, host: string) {
        if (!this.isEnabled()) {
            return;
        }
        let counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(endpoint, host);
        counter.throttleCount++;
    }

    public countRetry(endpoint: number, host: string) {
        if (!this.isEnabled()) {
            return;
        }
        let counter: NetworkStatsbeat = this._getNetworkStatsbeatCounter(endpoint, host);
        counter.retryCount++;
    }

    public async trackShortIntervalStatsbeats() {
        try {
            await this._getResourceProvider();
            let networkProperties = {
                os: this._os,
                rp: this._resourceProvider,
                cikey: this._cikey,
                runtimeVersion: this._runtimeVersion,
                language: this._language,
                version: this._sdkVersion,
                attach: this._attach,
            };
            this._trackRequestDuration(networkProperties);
            this._trackRequestsCount(networkProperties);
            await this._sendStatsbeats();
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
                attach: this._attach,
            };
            let attachProperties = Object.assign(
                {
                    rpId: this._resourceIdentifier,
                },
                commonProperties
            );
            this._statbeatMetrics.push({
                name: StatsbeatCounter.ATTACH,
                value: 1,
                properties: attachProperties,
            });
            if (this._instrumentation != StatsbeatInstrumentation.NONE) {
                // Only send if there are some instrumentations enabled
                let instrumentationProperties = Object.assign(
                    {
                        feature: this._instrumentation,
                        type: StatsbeatFeatureType.Instrumentation,
                    },
                    commonProperties
                );
                this._statbeatMetrics.push({
                    name: StatsbeatCounter.FEATURE,
                    value: 1,
                    properties: instrumentationProperties,
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
                    properties: featureProperties,
                });
            }
            await this._sendStatsbeats();
        } catch (error) {
            Logger.getInstance().info(
                this._TAG,
                "Failed to send Statsbeat metrics: " + Util.getInstance().dumpObj(error)
            );
        }
    }

    private _getNetworkStatsbeatCounter(endpoint: number, host: string): NetworkStatsbeat {
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

    private _trackRequestDuration(commonProperties: {}) {
        for (let i = 0; i < this._networkStatsbeatCollection.length; i++) {
            var currentCounter = this._networkStatsbeatCollection[i];
            currentCounter.time = +new Date();
            var intervalRequests =
                currentCounter.totalRequestCount - currentCounter.lastRequestCount || 0;
            var averageRequestExecutionTime =
                (currentCounter.intervalRequestExecutionTime -
                    currentCounter.lastIntervalRequestExecutionTime) /
                intervalRequests || 0;
            currentCounter.lastIntervalRequestExecutionTime =
                currentCounter.intervalRequestExecutionTime; // reset
            if (intervalRequests > 0) {
                // Add extra properties
                let properties = Object.assign(
                    {
                        endpoint: this._networkStatsbeatCollection[i].endpoint,
                        host: this._networkStatsbeatCollection[i].host,
                    },
                    commonProperties
                );
                this._statbeatMetrics.push({
                    name: StatsbeatCounter.REQUEST_DURATION,
                    value: averageRequestExecutionTime,
                    properties: properties,
                });
            }
            // Set last counters
            currentCounter.lastRequestCount = currentCounter.totalRequestCount;
            currentCounter.lastTime = currentCounter.time;
        }
    }

    private _trackRequestsCount(commonProperties: {}) {
        for (let i = 0; i < this._networkStatsbeatCollection.length; i++) {
            var currentCounter = this._networkStatsbeatCollection[i];
            let properties = Object.assign(
                { endpoint: currentCounter.endpoint, host: currentCounter.host },
                commonProperties
            );
            if (currentCounter.totalSuccesfulRequestCount > 0) {
                this._statbeatMetrics.push({
                    name: StatsbeatCounter.REQUEST_SUCCESS,
                    value: currentCounter.totalSuccesfulRequestCount,
                    properties: properties,
                });
                currentCounter.totalSuccesfulRequestCount = 0; //Reset
            }
            if (currentCounter.totalFailedRequestCount > 0) {
                this._statbeatMetrics.push({
                    name: StatsbeatCounter.REQUEST_FAILURE,
                    value: currentCounter.totalFailedRequestCount,
                    properties: properties,
                });
                currentCounter.totalFailedRequestCount = 0; //Reset
            }
            if (currentCounter.retryCount > 0) {
                this._statbeatMetrics.push({
                    name: StatsbeatCounter.RETRY_COUNT,
                    value: currentCounter.retryCount,
                    properties: properties,
                });
                currentCounter.retryCount = 0; //Reset
            }
            if (currentCounter.throttleCount > 0) {
                this._statbeatMetrics.push({
                    name: StatsbeatCounter.THROTTLE_COUNT,
                    value: currentCounter.throttleCount,
                    properties: properties,
                });
                currentCounter.throttleCount = 0; //Reset
            }
            if (currentCounter.exceptionCount > 0) {
                this._statbeatMetrics.push({
                    name: StatsbeatCounter.EXCEPTION_COUNT,
                    value: currentCounter.exceptionCount,
                    properties: properties,
                });
                currentCounter.exceptionCount = 0; //Reset
            }
        }
    }

    private async _sendStatsbeats() {
        for (let i = 0; i < this._statbeatMetrics.length; i++) {
            let statsbeat: MetricPointTelemetry = {
                name: this._statbeatMetrics[i].name,
                value: this._statbeatMetrics[i].value,
            };
            let metricTelemetry: MetricTelemetry = {
                metrics: [statsbeat],
                properties: this._statbeatMetrics[i].properties,
            };
            // this._metricHandler.trackStatsbeatMetric(metricTelemetry);
        }
    }

    private _getCustomProperties() {
        this._language = STATSBEAT_LANGUAGE;
        this._cikey = this._config.instrumentationKey;
        const sdkVersion = String(this._resourceManager.getTraceResource().attributes[KnownContextTagKeys.AiInternalSdkVersion]) || null;
        this._sdkVersion = sdkVersion; // "node" or "node-nativeperf"
        this._os = os.type();
        this._runtimeVersion = process.version;
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
                await this._azureVm.getAzureComputeMetadata(this._config).then((vmInfo: IVirtualMachineInfo) => {
                    this._isVM = vmInfo.isVM;
                    if (this._isVM) {
                        this._resourceProvider = StatsbeatResourceProvider.vm;
                        this._resourceIdentifier = vmInfo.id + "/" + vmInfo.subscriptionId;
                        // Override OS as VM info have higher precedence
                        if (vmInfo.osType) {
                            this._os = vmInfo.osType;
                        }
                    }
                }).catch((error) => Logger.getInstance().debug(error));

            } else {
                this._resourceProvider = StatsbeatResourceProvider.unknown;
            }
        }
    }
}
