
import Config = require("./Config");
import Util = require("./Util");
import AutoCollectHttpDependencies = require("../AutoCollection/HttpDependencies");

const AIMS_URI = "http://169.254.169.254/metadata/instance/compute";
const AIMS_API_VERSION = "api-version=2017-12-01";
const AIMS_FORMAT = "format=json";

class AzureVirtualMachine {

    public isVM: boolean;
    public id: string;
    public subscriptionId: string;
    public osType: string;

    constructor(config: Config) {
        this.isVM = false;
        this.id = "";
        this.subscriptionId = "";
        this.osType = "";
        this.initialize(config);
    }

    private async initialize(config: Config) {
        await this._getAzureComputeMetadata(config);
    }

    private async _getAzureComputeMetadata(config: Config) {
        const metadataRequestUrl = `${AIMS_URI}?${AIMS_API_VERSION}&${AIMS_FORMAT}`;
        const requestOptions = {
            method: 'GET',
            [AutoCollectHttpDependencies.disableCollectionRequestOption]: true,
            headers: {
                "Metadata": "True",
            }
        };

        const req = Util.makeRequest(config, metadataRequestUrl, requestOptions, (res) => {
            if (res.statusCode === 200) {
                // Success; VM
                this.isVM = true;
                let virtualMachineData = "";
                res.on('data', (data: any) => {
                    virtualMachineData += data;
                });
                res.on('end', () => {
                    try {
                        let data = JSON.parse(virtualMachineData);
                        this.id = data["vmId"] || "";
                        this.subscriptionId = data["subscriptionId"] || "";
                        this.osType = data["osType"] || "";
                    }
                    catch (e) { }
                });
            }
        });
    }
}

export = AzureVirtualMachine;
