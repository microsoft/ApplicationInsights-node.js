import { LogHandler } from "../library/handlers";

export class AutoCollectConsole {
    private _handler: LogHandler;

    constructor(handler: LogHandler) {
        this._handler = handler;
    }

    public enable(isEnabled: boolean, collectConsoleLog: boolean) {
        require("./diagnostic-channel/console.sub").enable(
            isEnabled && collectConsoleLog,
            this._handler
        );
        require("./diagnostic-channel/bunyan.sub").enable(isEnabled, this._handler);
        require("./diagnostic-channel/winston.sub").enable(isEnabled, this._handler);
    }
}
