import os = require("os");
import fs = require("fs");
import path = require("path");

import Contracts = require("../Declarations/Contracts");
import { APPLICATION_INSIGHTS_SDK_VERSION } from "../Declarations/Constants";
import Logging = require("./Logging");

class Context {

    public keys: Contracts.ContextTagKeys;
    public tags: { [key: string]: string };
    public static DefaultRoleName: string = "Web";
    public static appVersion: { [path: string]: string } = {};
    public static sdkVersion: string = null;

    constructor(packageJsonPath?: string) {
        this.keys = new Contracts.ContextTagKeys();
        this.tags = <{ [key: string]: string }>{};

        this._loadApplicationContext(packageJsonPath);
        this._loadDeviceContext();
        this._loadInternalContext();
    }

    private _loadApplicationContext(packageJsonPath?: string) {
        try {
            packageJsonPath = packageJsonPath || path.resolve(__dirname, "../../../../package.json");
            if (!Context.appVersion[packageJsonPath]) {
                Context.appVersion[packageJsonPath] = "unknown";
                let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
                if (packageJson && typeof packageJson.version === "string") {
                    Context.appVersion[packageJsonPath] = packageJson.version;
                }
            }
            this.tags[this.keys.applicationVersion] = Context.appVersion[packageJsonPath];
        }
        catch (exception) {
            Logging.info("Failed to read app version: ", exception);
        }
    }

    private _loadDeviceContext() {

        let cloudRoleInstance = os && os.hostname();
        let cloudRole = Context.DefaultRoleName;

        // Try to get more accurate roleName and instance when running in Azure
        if (process.env.WEBSITE_SITE_NAME) { // Azure Web apps and Functions
            cloudRole = process.env.WEBSITE_SITE_NAME;
        }
        if (process.env.WEBSITE_INSTANCE_ID) {
            cloudRoleInstance = process.env.WEBSITE_INSTANCE_ID;
        }

        this.tags[this.keys.deviceId] = "";
        this.tags[this.keys.cloudRoleInstance] = cloudRoleInstance;
        this.tags[this.keys.deviceOSVersion] = os && (os.type() + " " + os.release());
        this.tags[this.keys.cloudRole] = cloudRole;

        // not yet supported tags
        this.tags["ai.device.osArchitecture"] = os && os.arch();
        this.tags["ai.device.osPlatform"] = os && os.platform();
    }

    private _loadInternalContext() {
        Context.sdkVersion = APPLICATION_INSIGHTS_SDK_VERSION;
        this.tags[this.keys.internalSdkVersion] = "node:" + Context.sdkVersion;
    }
}

export = Context;
