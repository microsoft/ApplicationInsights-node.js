import * as os from "os";
import { AzureExporterConfig, AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
import { Meter, ObservableGauge, ObservableResult } from "@opentelemetry/api-metrics";
import {
    MeterProvider,
    PeriodicExportingMetricReader,
    PeriodicExportingMetricReaderOptions,
} from "@opentelemetry/sdk-metrics-base";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

import { AzureVirtualMachine } from "../../library";
import { ResourceManager } from "../../library/handlers";
import { HeartBeatMetricName } from "../../declarations/constants";
import { Config } from "../../library/configuration";
import { IVirtualMachineInfo } from "../../library/azureVirtualMachine";
import { Logger } from "../../library/logging";
import { createMeterProvider } from "./utils";

export class HeartBeat {
    private _collectionInterval: number = 900000;
    private _config: Config;
    private _meterProvider: MeterProvider;
    private _meter: Meter;
    private _metricGauge: ObservableGauge;
    private _isVM: boolean;
    private _azureVm: AzureVirtualMachine;

    constructor(config: Config) {
        this._config = config;
        this._azureVm = new AzureVirtualMachine();
        this._meterProvider = createMeterProvider(this._config, null, this._collectionInterval);
        this._meter = this._meterProvider.getMeter("ApplicationInsightsHeartBeatMeter");
        this._metricGauge = this._meter.createObservableGauge(HeartBeatMetricName);
        this._metricGauge.addCallback(this._trackHeartBeat);
    }

    public async shutdown(): Promise<void> {
        await this._meterProvider.shutdown();
    }

    private _trackHeartBeat(observableResult: ObservableResult) {
        this._getMachineProperties().then((props) => {
            observableResult.observe(0, props);
        });
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
                await this._azureVm.getAzureComputeMetadata(this._config).then((vmInfo: IVirtualMachineInfo) => {
                    this._isVM = vmInfo.isVM;
                    if (this._isVM) {
                        properties["azInst_vmId"] = vmInfo.id;
                        properties["azInst_subscriptionId"] = vmInfo.subscriptionId;
                        properties["azInst_osType"] = vmInfo.osType;
                    }
                }).catch((error) => Logger.getInstance().debug(error));
            }
        }
        return properties;
    }
}
