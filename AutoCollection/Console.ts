import Client = require("../Library/TelemetryClient");
import Logging = require("../Library/Logging");

import {enable as enableConsole} from "./diagnostic-channel/console.sub";
import {enable as enableBunyan} from "./diagnostic-channel/bunyan.sub";

import "./diagnostic-channel/initialization";

class AutoCollectConsole {
    public static originalMethods: {[name: string]: (message?: any, ...optionalParams: any[]) => void};

    public static INSTANCE: AutoCollectConsole;
    private static _methodNames = ["debug", "info", "log", "warn", "error"];

    private _client: Client;
    private _isInitialized: boolean;

    constructor(client: Client) {
        if(!!AutoCollectConsole.INSTANCE) {
            throw new Error("Console logging adapter tracking should be configured from the applicationInsights object");
        }

        this._client = client;
        AutoCollectConsole.INSTANCE = this;
    }

    public enable(isEnabled: boolean) {
        enableConsole(isEnabled, this._client);
        enableBunyan(isEnabled, this._client);
    }

    public isInitialized() {
        return this._isInitialized;
    }

    public dispose() {
        AutoCollectConsole.INSTANCE = null;
        this.enable(false);
    }
}

export = AutoCollectConsole;