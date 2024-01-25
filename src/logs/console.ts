import { InstrumentationOptions } from "@azure/monitor-opentelemetry";
import { LogApi } from "./api";
import { enablePublishers } from "./diagnostic-channel/initialization";
enablePublishers();

export class AutoCollectConsole {
    private _client: LogApi;

    constructor(client: LogApi) {
        this._client = client;
    }

    public enable(options: InstrumentationOptions) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/console.sub").enable(options.console?.enabled, this._client);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/winston.sub").enable(options.winston?.enabled, this._client);
    }

    public shutdown() {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/console.sub").enable(false, this._client);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/winston.sub").enable(false, this._client);
    }
}
