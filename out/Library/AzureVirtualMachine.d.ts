import Config = require("./Config");
export interface IVirtualMachineInfo {
    isVM?: boolean;
    id?: string;
    subscriptionId?: string;
    osType?: string;
}
export declare class AzureVirtualMachine {
    static HTTP_TIMEOUT: number;
    private static TAG;
    private static _requestTimedOut;
    static getAzureComputeMetadata(config: Config, callback: (vm: IVirtualMachineInfo) => void): void;
}
