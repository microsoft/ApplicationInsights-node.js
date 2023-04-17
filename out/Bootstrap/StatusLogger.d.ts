import * as DataModel from "./DataModel";
export interface StatusContract {
    AgentInitializedSuccessfully: boolean;
    Reason?: string;
    SDKPresent: boolean;
    AppType: string;
    MachineName: string;
    PID: string;
    SdkVersion: string;
    Ikey: string;
}
export declare class StatusLogger {
    _writer: DataModel.AgentLogger;
    static readonly DEFAULT_FILE_PATH: string;
    static readonly DEFAULT_FILE_NAME: string;
    static readonly DEFAULT_STATUS: StatusContract;
    constructor(_writer?: DataModel.AgentLogger, instrumentationKey?: string);
    logStatus(data: StatusContract, cb?: (err: Error) => void): void;
}
