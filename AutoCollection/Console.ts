import Client = require("../Library/Client");
import Logging = require("../Library/Logging");

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
        // todo: investigate feasibility/utility of this; does it make sense to have a logging adapter in node?
    }

    public isInitialized() {
        return this._isInitialized;
    }
}

export = AutoCollectConsole;