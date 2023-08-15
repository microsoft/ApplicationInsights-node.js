import { ApplicationInsightsClient } from "../applicationInsightsClient";
import { LogInstrumentationOptions } from "../types";
import { enablePublishers } from "./diagnostic-channel/initialization";
enablePublishers();

export class AutoCollectConsole {
    private _client: ApplicationInsightsClient;

    constructor(client: ApplicationInsightsClient) {
        this._client = client;
    }

    public enable(options: LogInstrumentationOptions) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/console.sub").enable(options.console.enabled, this._client);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/bunyan.sub").enable(options.bunyan.enabled, this._client);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/winston.sub").enable(options.winston.enabled, this._client);
    }

    public shutdown() {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/console.sub").enable(false, this._client);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/bunyan.sub").enable(false, this._client);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/winston.sub").enable(false, this._client);
    }
}
