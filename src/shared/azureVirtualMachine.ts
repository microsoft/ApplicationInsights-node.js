import { ApplicationInsightsConfig } from "./configuration";
import { Logger } from "./logging";
import { Util } from "./util";

const AIMS_URI = "http://169.254.169.254/metadata/instance/compute";
const AIMS_API_VERSION = "api-version=2017-12-01";
const AIMS_FORMAT = "format=json";
const ConnectionErrorMessage = "UNREACH"; // EHOSTUNREACH, ENETUNREACH

export interface IVirtualMachineInfo {
    isVM?: boolean;
    id?: string;
    subscriptionId?: string;
    osType?: string;
}

export class AzureVirtualMachine {
    private _TAG = "AzureVirtualMachine";

    public async getAzureComputeMetadata(
        config: ApplicationInsightsConfig
    ): Promise<IVirtualMachineInfo> {
        const vmInfo: IVirtualMachineInfo = {};
        const metadataRequestUrl = `${AIMS_URI}?${AIMS_API_VERSION}&${AIMS_FORMAT}`;
        const requestOptions = {
            method: "GET",
            headers: {
                Metadata: "True",
            },
        };
        return new Promise((resolve, reject) => {
            const req = Util.getInstance().makeRequest(
                config,
                metadataRequestUrl,
                requestOptions,
                (res) => {
                    if (res.statusCode === 200) {
                        // Success; VM
                        vmInfo.isVM = true;
                        let virtualMachineData = "";
                        res.on("data", (data: any) => {
                            virtualMachineData += data;
                        });
                        res.on("end", () => {
                            try {
                                const data = JSON.parse(virtualMachineData);
                                vmInfo.id = data["vmId"] || "";
                                vmInfo.subscriptionId = data["subscriptionId"] || "";
                                vmInfo.osType = data["osType"] || "";
                            } catch (error) {
                                // Failed to parse JSON
                                Logger.getInstance().info(this._TAG, error);
                            }
                            resolve(vmInfo);
                        });
                    } else {
                        resolve(vmInfo);
                    }
                },
                false,
                false
            );
            if (req) {
                req.on("error", (error: Error) => {
                    // Unable to contact endpoint.
                    // Do nothing for now.
                    if (
                        error &&
                        error.message &&
                        error.message.indexOf(ConnectionErrorMessage) > -1
                    ) {
                        vmInfo.isVM = false; // confirm it's not in VM
                    } else {
                        // Only log when is not determined if VM or not to avoid noise outside of Azure VMs
                        Logger.getInstance().info(this._TAG, error);
                    }
                    reject(error);
                });
                req.end();
            }
        });
    }
}
