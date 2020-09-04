"use strict";

import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as DataModel from "./DataModel";
import { FileWriter, homedir } from "./FileWriter";

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

function readPackageVersion() {
    let packageJsonPath = path.resolve(__dirname, "../../package.json");
    try {
        let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        if (packageJson && typeof packageJson.version === "string") {
            return packageJson.version;
        }
    } catch (e) { }
    return "unknown";
}

export class StatusLogger {
    public static readonly DEFAULT_FILE_PATH: string = path.join(homedir, "status");
    public static readonly DEFAULT_FILE_NAME: string = `status_${os.hostname()}_${process.pid}.json`;
    public static readonly DEFAULT_STATUS: StatusContract = {
        AgentInitializedSuccessfully: false,
        SDKPresent: false,
        Ikey: "unknown",
        AppType: "node.js",
        SdkVersion: readPackageVersion(),
        MachineName: os.hostname(),
        PID: String(process.pid)
    }

    constructor(public _writer: DataModel.AgentLogger = console) {}

    public logStatus(data: StatusContract, cb?: (err: Error) => void) {
        if (typeof cb === "function" && this._writer instanceof FileWriter) {
            this._writer.callback = cb;
        }
        this._writer.log(data);
    }
}
