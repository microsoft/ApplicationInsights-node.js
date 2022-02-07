import os } from "os");

import { Vm } from "../Library/AzureVirtualMachine";
import { TelemetryClient } from "../Library/TelemetryClient";
import * as  Constants from "../Declarations/Constants";
import { Config } from "../Library/Configuration/Config";
import { Context } from "../Library/Context";

export class HeartBeat {
    private _collectionInterval: number = 900000;
    private _client: TelemetryClient;
    private _handle: NodeJS.Timer | null;
    private _isVM: boolean;

    constructor(client: TelemetryClient) {
        this._client = client;
    }

    public enable(isEnabled: boolean) {
        if (isEnabled) {
            if (!this._handle) {
                this._handle = setInterval(() => this.trackHeartBeat(this._client.config, () => { }), this._collectionInterval);
                this._handle.unref(); // Allow the app to terminate even while this loop is going on
            }
        } else {
            if (this._handle) {
                clearInterval(this._handle);
                this._handle = null;
            }
        }
    }

    public trackHeartBeat(config: Config, callback: () => void) {
        let waiting: boolean = false;
        let properties: { [key: string]: string } = {};
        const sdkVersion = Context.sdkVersion; // "node" or "node-nativeperf"
        properties["sdk"] = sdkVersion;
        properties["osType"] = os.type();
        if (process.env.WEBSITE_SITE_NAME) { // Web apps
            properties["appSrv_SiteName"] = process.env.WEBSITE_SITE_NAME || "";
            properties["appSrv_wsStamp"] = process.env.WEBSITE_HOME_STAMPNAME || "";
            properties["appSrv_wsHost"] = process.env.WEBSITE_HOSTNAME || "";
        } else if (process.env.FUNCTIONS_WORKER_RUNTIME) { // Function apps
            properties["azfunction_appId"] = process.env.WEBSITE_HOSTNAME;
        } else if (config) {
            if (this._isVM === undefined) {
                waiting = true;
                Vm.AzureVirtualMachine.getAzureComputeMetadata(config, (vmInfo) => {
                    this._isVM = vmInfo.isVM;
                    if (this._isVM) {
                        properties["azInst_vmId"] = vmInfo.id;
                        properties["azInst_subscriptionId"] = vmInfo.subscriptionId;
                        properties["azInst_osType"] = vmInfo.osType;
                    }
                    this._client.trackMetric({ name: Constants.HeartBeatMetricName, value: 0, properties: properties });
                    callback();
                });
            }
        }
        if (!waiting) {
            this._client.trackMetric({ name: Constants.HeartBeatMetricName, value: 0, properties: properties });
            callback();
        }
    }
}
