import * as fs from "fs";
import * as os from "os";
import * as child_process from "child_process";

import { Logger } from "../../../shared/logging";

const ICACLS_PATH = `${process.env.systemdrive}/windows/system32/icacls.exe`;
const POWERSHELL_PATH = `${process.env.systemdrive}/windows/system32/windowspowershell/v1.0/powershell.exe`;

export class FileAccessControl {
    private static _instance: FileAccessControl;
    private _TAG = "FileAccessControl";
    private _ACLedDirectories: { [id: string]: boolean };
    private _ACLIdentity: string;
    private _osFileProtectionChecked: boolean;
    public osProvidesFileProtection: boolean;
    public useICACLS: boolean;

    static getInstance() {
        if (!FileAccessControl._instance) {
            FileAccessControl._instance = new FileAccessControl();
        }
        return FileAccessControl._instance;
    }

    constructor() {
        this._ACLedDirectories = {};
        this._ACLIdentity = null;
        this._osFileProtectionChecked = false;
        this.osProvidesFileProtection = false;
        this.useICACLS = os.type() === "Windows_NT";
    }

    // Check if file access control could be enabled
    public checkFileProtection() {
        if (!this.osProvidesFileProtection && !this._osFileProtectionChecked) {
            this._osFileProtectionChecked = true;
            // Node's chmod levels do not appropriately restrict file access on Windows
            // Use the built-in command line tool ICACLS on Windows to properly restrict
            // access to the temporary directory used for disk retry mode.
            if (this.useICACLS) {
                // This should be async - but it's currently safer to have this synchronous
                // This guarantees we can immediately fail setDiskRetryMode if we need to
                try {
                    this.osProvidesFileProtection = fs.existsSync(ICACLS_PATH);
                } catch (e) {
                    // Ignore error
                }
                if (!this.osProvidesFileProtection) {
                    Logger.getInstance().warn(
                        this._TAG,
                        "Could not find ICACLS in expected location! This is necessary to use disk retry mode on Windows."
                    );
                }
            } else {
                // chmod works everywhere else
                this.osProvidesFileProtection = true;
            }
        }
    }

    public async applyACLRules(directory: string): Promise<void> {
        if (this.useICACLS) {
            if (this._ACLedDirectories[directory] === undefined) {
                // Avoid multiple calls race condition by setting ACLED_DIRECTORIES to false for this directory immediately
                // If batches are being failed faster than the processes spawned below return, some data won't be stored to disk
                // This is better than the alternative of potentially infinitely spawned processes
                this._ACLedDirectories[directory] = false;
                try {
                    // Restrict this directory to only current user and administrator access
                    let identity = await this._getACLIdentity();
                    await this._runICACLS(this._getACLArguments(directory, identity));
                    this._ACLedDirectories[directory] = true;
                } catch (ex) {
                    this._ACLedDirectories[directory] = false; // false is used to cache failed (vs undefined which is "not yet tried")
                    throw ex;
                }
            } else {
                if (!this._ACLedDirectories[directory]) {
                    throw new Error("Setting ACL restrictions did not succeed (cached result)");
                }
            }
        }
    }

    public applyACLRulesSync(directory: string) {
        if (this.useICACLS) {
            // For performance, only run ACL rules if we haven't already during this session
            if (this._ACLedDirectories[directory] === undefined) {
                this._runICACLSSync(this._getACLArguments(directory, this._getACLIdentitySync()));
                this._ACLedDirectories[directory] = true; // If we get here, it succeeded. _runIACLSSync will throw on failures
                return;
            } else if (!this._ACLedDirectories[directory]) {
                // falsy but not undefined
                throw new Error("Setting ACL restrictions did not succeed (cached result)");
            }
        }
    }

    private _runICACLS(args: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            var aclProc = child_process.spawn(ICACLS_PATH, args, <any>{ windowsHide: true });
            aclProc.on("error", (e: Error) => reject(e));
            aclProc.on("close", (code: number, signal: string) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(
                        new Error(
                            `Setting ACL restrictions did not succeed (ICACLS returned code ${code})`
                        )
                    );
                }
            });
        });
    }

    private _runICACLSSync(args: string[]) {
        // Some very old versions of Node (< 0.11) don't have this
        if (child_process.spawnSync) {
            var aclProc = child_process.spawnSync(ICACLS_PATH, args, <any>{ windowsHide: true });
            if (aclProc.error) {
                throw aclProc.error;
            } else if (aclProc.status !== 0) {
                throw new Error(
                    `Setting ACL restrictions did not succeed (ICACLS returned code ${aclProc.status})`
                );
            }
        } else {
            throw new Error("Could not synchronously call ICACLS under current version of Node.js");
        }
    }

    private _getACLIdentity(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this._ACLIdentity) {
                resolve(this._ACLIdentity);
            }
            var psProc = child_process.spawn(
                POWERSHELL_PATH,
                ["-Command", "[System.Security.Principal.WindowsIdentity]::GetCurrent().Name"],
                <any>{
                    windowsHide: true,
                    stdio: ["ignore", "pipe", "pipe"], // Needed to prevent hanging on Win 7
                }
            );
            let data = "";
            psProc.stdout.on("data", (d: string) => (data += d));
            psProc.on("error", (e: Error) => reject(e));
            psProc.on("close", (code: number, signal: string) => {
                this._ACLIdentity = data && data.trim();
                if (code === 0) {
                    resolve(this._ACLIdentity);
                } else {
                    reject(
                        new Error(`Getting ACL identity did not succeed (PS returned code ${code})`)
                    );
                }
            });
        });
    }

    private _getACLIdentitySync() {
        if (this._ACLIdentity) {
            return this._ACLIdentity;
        }
        // Some very old versions of Node (< 0.11) don't have this
        if (child_process.spawnSync) {
            var psProc = child_process.spawnSync(
                POWERSHELL_PATH,
                ["-Command", "[System.Security.Principal.WindowsIdentity]::GetCurrent().Name"],
                <any>{
                    windowsHide: true,
                    stdio: ["ignore", "pipe", "pipe"], // Needed to prevent hanging on Win 7
                }
            );
            if (psProc.error) {
                throw psProc.error;
            } else if (psProc.status !== 0) {
                throw new Error(
                    `Getting ACL identity did not succeed (PS returned code ${psProc.status})`
                );
            }
            this._ACLIdentity = psProc.stdout && psProc.stdout.toString().trim();
            return this._ACLIdentity;
        } else {
            throw new Error(
                "Could not synchronously get ACL identity under current version of Node.js"
            );
        }
    }

    private _getACLArguments(directory: string, identity: string) {
        return [
            directory,
            "/grant",
            "*S-1-5-32-544:(OI)(CI)F", // Full permission for Administrators
            "/grant",
            `${identity}:(OI)(CI)F`, // Full permission for current user
            "/inheritance:r",
        ]; // Remove all inherited permissions
    }
}
