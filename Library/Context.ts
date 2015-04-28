///<reference path="..\Declarations\node\node.d.ts" />

import os = require("os");
import http = require("http");

import ContractsModule = require("../Library/Contracts");
import Logging = require("./Logging");

class Context {

    public keys: ContractsModule.Contracts.ContextTagKeys;
    public tags: { [key: string]: string};

    constructor(server?: http.Server) {
        this.keys = new ContractsModule.Contracts.ContextTagKeys();
        this.tags = <{ [key: string]: string}>{};

        this._loadApplicationContext();
        this._loadDeviceContext(server);
        this._loadInternalContext();
    }

    private _loadApplicationContext() {
        var version = "unknown";
        var description = undefined;

        try {
            // note: this should return the host package.json
            var packageJson = require("../../../package.json");
            if(packageJson) {
                if (typeof packageJson.version === "string") {
                    version = packageJson.version;
                }

                if (typeof packageJson.description === "string") {
                    description = packageJson.description;
                }
            }
        } catch (exception) {
            console.log("unable to read version: " + exception);
        }

        this.tags[this.keys.applicationVersion] = version;
        if(description) {
            this.tags[this.keys.applicationBuild] = description;
        }
    }

    private _loadDeviceContext(server: http.Server) {
        this.tags[this.keys.deviceId] = "node";
        this.tags[this.keys.deviceIp] = server && server.address() && server.address().address;
        this.tags[this.keys.deviceMachineName] = os && os.hostname();
        this.tags[this.keys.deviceOS] = os && os.type();
        this.tags[this.keys.deviceOSVersion] = os && (os.arch() + ":" + os.platform());
        this.tags[this.keys.deviceType] = "server";
    }

    private _loadInternalContext() {
        var version = "unknown";

        try {
            // note: this should return the appInsights package.json
            var packageJson = require("../package.json");
            if(packageJson && typeof packageJson.version === "string") {
                version = packageJson.version;
            }
        } catch (exception) {
            Logging.info("unable to read version: " + exception);
        }

        this.tags[this.keys.internalSdkVersion] = version;
    }
}

export = Context;