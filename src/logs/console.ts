import { LogInstrumentationsConfig } from "../shared/configuration/types";
import { LogHandler } from "./logHandler";
import { enablePublishers } from "./diagnostic-channel/initialization";
enablePublishers();

export class AutoCollectConsole {
    private _handler: LogHandler;

    constructor(handler: LogHandler) {
        this._handler = handler;
    }

    public enable(config: LogInstrumentationsConfig) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/console.sub").enable(config.console.enabled, this._handler);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/bunyan.sub").enable(config.bunyan.enabled, this._handler);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/winston.sub").enable(config.winston.enabled, this._handler);
    }

    public shutdown() {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/console.sub").enable(false, this._handler);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/bunyan.sub").enable(false, this._handler);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/winston.sub").enable(false, this._handler);
    }
}
