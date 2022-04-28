import { LogHandler } from "../Library/Handlers/LogHandler";
import * as DiagChannel from "./diagnostic-channel/initialization";

export class AutoCollectConsole {
    private _handler: LogHandler;

    constructor(handler: LogHandler) {
        this._handler = handler;
    }

    public enable(isEnabled: boolean, collectConsoleLog: boolean) {
        if (DiagChannel.IsInitialized) {
            require("./diagnostic-channel/console.sub").enable(
                isEnabled && collectConsoleLog,
                this._handler
            );
            require("./diagnostic-channel/bunyan.sub").enable(isEnabled, this._handler);
            require("./diagnostic-channel/winston.sub").enable(isEnabled, this._handler);
        }
    }
}
