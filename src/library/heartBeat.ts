import * as os from "os";

import { AzureVirtualMachine } from "../library";
import { MetricHandler } from "../library/handlers";
import * as Constants from "../declarations/constants";
import { Config } from "../library/configuration";
import { KnownContextTagKeys } from "../declarations/generated";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

export class HeartBeat {
    private _collectionInterval: number = 900000;
    private _config: Config;
    private _handler: MetricHandler;
    private _handle: NodeJS.Timer | null;
    private _isVM: boolean;
    private _azureVm: AzureVirtualMachine;

    constructor(handler: MetricHandler, config: Config) {
        this._handler = handler;
        this._config = config;
        this._azureVm = new AzureVirtualMachine();
    }

    public enable(isEnabled: boolean) {
        if (isEnabled) {
            if (!this._handle) {
                this._handle = setInterval(
                    () => this.trackHeartBeat(this._config, () => {}),
                    this._collectionInterval
                );
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

        // TODO: Add sdk property for attach scenarios, confirm if this is only expected when attach happens, older code doing this was present in Default.ts

        const sdkVersion = String(this._handler.getResourceManager().getTraceResource().attributes[SemanticResourceAttributes.TELEMETRY_SDK_VERSION]) || null;

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
        } else if (config) {
            if (this._isVM === undefined) {
                waiting = true;
                this._azureVm.getAzureComputeMetadata(config, (vmInfo) => {
                    this._isVM = vmInfo.isVM;
                    if (this._isVM) {
                        properties["azInst_vmId"] = vmInfo.id;
                        properties["azInst_subscriptionId"] = vmInfo.subscriptionId;
                        properties["azInst_osType"] = vmInfo.osType;
                    }
                    this._handler.trackMetric({
                        metrics: [{ name: Constants.HeartBeatMetricName, value: 0 }],
                        properties: properties,
                    });
                    callback();
                });
            }
        }
        if (!waiting) {
            this._handler.trackMetric({
                metrics: [{ name: Constants.HeartBeatMetricName, value: 0 }],
                properties: properties,
            });
            callback();
        }
    }
}
