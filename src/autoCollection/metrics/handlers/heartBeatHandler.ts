import * as os from "os";
import {
    AzureMonitorExporterOptions,
    AzureMonitorMetricExporter
} from "@azure/monitor-opentelemetry-exporter";
import {
    Meter,
    ObservableCallback,
    ObservableGauge,
    ObservableResult
} from "@opentelemetry/api-metrics";
import {
    MeterProvider,
    PeriodicExportingMetricReader,
    PeriodicExportingMetricReaderOptions,
} from "@opentelemetry/sdk-metrics";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

import { AzureVirtualMachine } from "../../../library";
import { ResourceManager } from "../../../library/handlers";
import { HeartBeatMetricName } from "../../../declarations/constants";
import { Config } from "../../../library/configuration";
import { IVirtualMachineInfo } from "../../../library/azureVirtualMachine";
import { Logger } from "../../../library/logging";

export class HeartBeatHandler {
    private _collectionInterval: number = 900000;
    private _config: Config;
    private _meterProvider: MeterProvider;
    private _azureExporter: AzureMonitorMetricExporter;
    private _metricReader: PeriodicExportingMetricReader;
    private _meter: Meter;
    private _metricGauge: ObservableGauge;
    private _metricGaugeCallback: ObservableCallback;
    private _isVM: boolean;
    private _azureVm: AzureVirtualMachine;
    private _machineProperties: { [key: string]: string };

    constructor(config: Config, options?: { collectionInterval: number }) {
        this._config = config;
        this._azureVm = new AzureVirtualMachine();
        this._meterProvider = new MeterProvider();
        let exporterConfig: AzureMonitorExporterOptions = {
            connectionString: config.getConnectionString(),
            aadTokenCredential: config.aadTokenCredential
        };
        this._azureExporter = new AzureMonitorMetricExporter(exporterConfig);
        const metricReaderOptions: PeriodicExportingMetricReaderOptions = {
            exporter: this._azureExporter as any,
            exportIntervalMillis: options?.collectionInterval || this._collectionInterval
        };
        this._metricReader = new PeriodicExportingMetricReader(metricReaderOptions);
        this._meterProvider.addMetricReader(this._metricReader);
        this._meter = this._meterProvider.getMeter("ApplicationInsightsHeartBeatMeter");
        this._metricGauge = this._meter.createObservableGauge(HeartBeatMetricName);
        this._metricGaugeCallback = this._trackHeartBeat.bind(this);
    }

    public async start() {
        this._machineProperties = await this._getMachineProperties();
        this._metricGauge.addCallback(this._metricGaugeCallback);
    }

    public async shutdown(): Promise<void> {
        await this._meterProvider.shutdown();
    }

    private _trackHeartBeat(observableResult: ObservableResult) {
        observableResult.observe(0, this._machineProperties);
    }

    private async _getMachineProperties(): Promise<{ [key: string]: string }> {
        let properties: { [key: string]: string } = {};
        // TODO: Add sdk property for attach scenarios, confirm if this is only expected when attach happens, older code doing this was present in Default.ts
        const sdkVersion = String(ResourceManager.getInstance().getTraceResource().attributes[SemanticResourceAttributes.TELEMETRY_SDK_VERSION]) || null;
        properties["sdk"] = sdkVersion;
        properties["osType"] = os.type();
        if (process.env.WEBSITE_SITE_NAME) {
            // Web apps
            properties["appSrv_SiteName"] = process.env.WEBSITE_SITE_NAME || "";
            properties["appSrv_wsStamp"] = process.env.WEBSITE_HOME_STAMPNAME || "";
            properties["appSrv_wsHost"] = process.env.WEBSITE_HOSTNAME || "";
        } else if (process.env.FUNCTIONS_WORKER_RUNTIME) {
            // Function apps
            properties["azfunction_appId"] = process.env.WEBSITE_HOSTNAME;
        } else {
            if (this._isVM === undefined) {
                try {
                    let vmInfo: IVirtualMachineInfo = await this._azureVm.getAzureComputeMetadata(this._config);
                    this._isVM = vmInfo.isVM;
                    if (this._isVM) {
                        properties["azInst_vmId"] = vmInfo.id;
                        properties["azInst_subscriptionId"] = vmInfo.subscriptionId;
                        properties["azInst_osType"] = vmInfo.osType;
                    }
                }
                catch (error) {
                    Logger.getInstance().debug(error);
                }
            }
        }
        return properties;
    }
}
