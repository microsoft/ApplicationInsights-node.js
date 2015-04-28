import Client = require("../Library/Client");
import Logging = require("../Library/Logging");

class AutoCollectConsole {
    public static originalMethods: {[name: string]: (message?: any, ...optionalParams: any[]) => void};

    private static _INSTANCE: AutoCollectConsole = null;
    private static _methodNames = ["debug", "info", "log", "warn", "error"];

    private _client: Client;

    constructor(client: Client) {
        if(AutoCollectConsole._INSTANCE !== null) {
            throw new Error("Exception tracking should be configured from the applicationInsights object");
        }

        this._client = client;
    }

    public enable(isEnabled: boolean) {
        // todo: investigate feasibility/utility of this; does it make sense to have a logging adapter in node?
    }
}

export = AutoCollectConsole;