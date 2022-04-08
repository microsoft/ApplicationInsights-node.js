import * as os from "os";
import * as DataModel from "./DataModel";
import { FileWriter } from "./FileWriter";
import { APPLICATION_INSIGHTS_SDK_VERSION } from "../Declarations/Constants";

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

export const DEFAULT_STATUS_CONTRACT: StatusContract = {
    AgentInitializedSuccessfully: false,
    SDKPresent: false,
    Ikey: "unknown",
    AppType: "node.js",
    SdkVersion: APPLICATION_INSIGHTS_SDK_VERSION,
    MachineName: os.hostname(),
    PID: String(process.pid)
}

export class StatusLogger {
    constructor(public _writer: DataModel.AgentLogger = console) { }

    public logStatus(data: StatusContract, cb?: (err: Error) => void) {
        if (typeof cb === "function" && this._writer instanceof FileWriter) {
            this._writer.callback = cb;
        }
        this._writer.log(data);
    }
}
