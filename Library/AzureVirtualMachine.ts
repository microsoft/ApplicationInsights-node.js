
import http = require("http");
import https = require("https");
import Config = require("./Config");
import Logging = require("./Logging");
import Util = require("./Util");
import AutoCollectHttpDependencies = require("../AutoCollection/HttpDependencies");

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

    private static TAG = "AzureVirtualMachine";

    public static getAzureComputeMetadata(config: Config, callback: (vm: IVirtualMachineInfo) => void) {
        let vmInfo: IVirtualMachineInfo = {};
        const metadataRequestUrl = `${AIMS_URI}?${AIMS_API_VERSION}&${AIMS_FORMAT}`;
        const requestOptions: http.RequestOptions | https.RequestOptions = {
            method: "GET",
            [AutoCollectHttpDependencies.disableCollectionRequestOption]: true,
            headers: {
                "Metadata": "True"
            },
            timeout: 2500, // DNS resolution is taking long time in MacOS environments
        };

        const req = Util.makeRequest(config, metadataRequestUrl, requestOptions, (res) => {
            if (res.statusCode === 200) {
                // Success; VM
                vmInfo.isVM = true;
                let virtualMachineData = "";
                res.on("data", (data: any) => {
                    virtualMachineData += data;
                });
                res.on("end", () => {
                    try {
                        let data = JSON.parse(virtualMachineData);
                        vmInfo.id = data["vmId"] || "";
                        vmInfo.subscriptionId = data["subscriptionId"] || "";
                        vmInfo.osType = data["osType"] || "";
                    }
                    catch (error) {
                        // Failed to parse JSON
                        Logging.info(AzureVirtualMachine.TAG, error);
                    }
                    callback(vmInfo);
                });
            } else {
                callback(vmInfo);
            }
        }, false, false);
        if (req) {
            req.on("timeout", () => {
                req.abort();
            });
            req.on("error", (error: Error) => {
                // Unable to contact endpoint.
                // Do nothing for now.
                if (error && error.message && error.message.indexOf(ConnectionErrorMessage) > -1) {
                    vmInfo.isVM = false; // confirm it's not in VM
                }
                else {
                    // Only log when is not determined if VM or not to avoid noise outside of Azure VMs
                    Logging.info(AzureVirtualMachine.TAG, error);
                }
                callback(vmInfo);
            });
            req.end();
        }
    }
}
