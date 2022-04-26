"use strict";

import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as DataModel from "./DataModel";
import { FileWriter, homedir } from "./FileWriter";
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

export class StatusLogger {
    public static readonly DEFAULT_FILE_PATH: string = path.join(homedir, "status");
    public static readonly DEFAULT_FILE_NAME: string = `status_${os.hostname()}_${process.pid}.json`;
    public static readonly DEFAULT_STATUS: StatusContract = {
        AgentInitializedSuccessfully: false,
        SDKPresent: false,
        Ikey: "unknown",
        AppType: "node.js",
        SdkVersion: APPLICATION_INSIGHTS_SDK_VERSION,
        MachineName: os.hostname(),
        PID: String(process.pid)
    }

    constructor(public _writer: DataModel.AgentLogger = console, instrumentationKey: string = "unknown") {
        StatusLogger.DEFAULT_STATUS.Ikey = instrumentationKey;
    }

    public logStatus(data: StatusContract, cb?: (err: Error) => void) {
        if (typeof cb === "function" && this._writer instanceof FileWriter) {
            this._writer.callback = cb;
        }
        this._writer.log(data);
    }
}
