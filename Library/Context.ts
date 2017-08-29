import os = require("os");
import http = require("http");

import Contracts = require("../Declarations/Contracts");
import Logging = require("./Logging");

class Context {

    public keys: Contracts.ContextTagKeys;
    public tags: { [key: string]: string};
    public static DefaultRoleName:string = "Web";

    constructor(packageJsonPath?: string) {
        this.keys = new Contracts.ContextTagKeys();
        this.tags = <{ [key: string]: string}>{};

        this._loadApplicationContext();
        this._loadDeviceContext();
        this._loadInternalContext();
    }

    private _loadApplicationContext(packageJsonPath?: string) {
        var version = "unknown";
        var description = undefined;

        try {
            // note: this should return the host package.json
            var packageJson = require(packageJsonPath || "../../../package.json");
            if(packageJson) {
                if (typeof packageJson.version === "string") {
                    version = packageJson.version;
                }

                if (typeof packageJson.description === "string") {
                    description = packageJson.description;
                }
            }
        } catch (exception) {
            Logging.info("unable to read app version: ", exception);
        }

        this.tags[this.keys.applicationVersion] = version;
        // TODO: consider sending it as a custom property
        //if(description) {
        //    this.tags[this.keys.applicationBuild] = description;
        //}
    }

    private _loadDeviceContext() {
        this.tags[this.keys.deviceId] = "";
        this.tags[this.keys.cloudRoleInstance] = os && os.hostname();
        this.tags[this.keys.deviceOSVersion] = os && (os.type() + " " + os.release());
        this.tags[this.keys.cloudRole] = Context.DefaultRoleName;

        // not yet supported tags
        this.tags["ai.device.osArchitecture"] = os && os.arch();
        this.tags["ai.device.osPlatform"] = os && os.platform();
    }

    private _loadInternalContext() {
        var version = "unknown";

        try {
            // note: this should return the appInsights package.json
            var packageJson = require("../../package.json");
            if(packageJson && typeof packageJson.version === "string") {
                version = packageJson.version;
            }
        } catch (exception) {
            Logging.info("unable to read SDK version: " + exception);
        }

        this.tags[this.keys.internalSdkVersion] = "node:" + version || "unknown";
    }
}

export = Context;
