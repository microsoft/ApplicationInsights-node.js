import TelemetryClient = require("../Library/TelemetryClient");
import * as DiagChannel from "./diagnostic-channel/initialization";

class AutoCollectConsole {
    private _client: TelemetryClient;

    constructor(client: TelemetryClient) {
        this._client = client;
    }

    public enable(isEnabled: boolean, collectConsoleLog: boolean) {
        if (DiagChannel.IsInitialized) {
            require("./diagnostic-channel/console.sub").enable(isEnabled && collectConsoleLog, this._client);
            require("./diagnostic-channel/bunyan.sub").enable(isEnabled, this._client);
            require("./diagnostic-channel/winston.sub").enable(isEnabled, this._client);
        }
    }
}

export = AutoCollectConsole;
