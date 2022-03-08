import TelemetryClient = require("../Library/TelemetryClient");

import * as DiagChannel from "./diagnostic-channel/initialization";

class AutoCollectConsole {
    public static originalMethods: {[name: string]: (message?: any, ...optionalParams: any[]) => void};

    public static INSTANCE: AutoCollectConsole;
    private static _methodNames = ["debug", "info", "log", "warn", "error"];

    private _client: TelemetryClient;
    private _isInitialized: boolean;

    constructor(client: TelemetryClient) {
        if(!!AutoCollectConsole.INSTANCE) {
            throw new Error("Console logging adapter tracking should be configured from the applicationInsights object");
        }

        this._client = client;
        AutoCollectConsole.INSTANCE = this;
    }

    public enable(isEnabled: boolean, collectConsoleLog: boolean) {
        if (DiagChannel.IsInitialized) {
            require("./diagnostic-channel/console.sub").enable(isEnabled && collectConsoleLog, this._client);
            require("./diagnostic-channel/bunyan.sub").enable(isEnabled, this._client);
            require("./diagnostic-channel/winston.sub").enable(isEnabled, this._client);
        }
    }

    public isInitialized() {
        return this._isInitialized;
    }

    public dispose() {
        AutoCollectConsole.INSTANCE = null;
        this.enable(false, false);
    }
}

export = AutoCollectConsole;
