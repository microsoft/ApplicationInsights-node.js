import { LogInstrumentationsConfig } from "../../types";
import { enablePublishers } from "./diagnostic-channel/initialization";
import { TelemetryClient } from "../telemetryClient";
enablePublishers();

export class AutoCollectConsole {
    private _client: TelemetryClient;

    constructor(client: TelemetryClient) {
        this._client = client;
    }

    public enable(config: LogInstrumentationsConfig) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/console.sub").enable(config.console.enabled, this._client);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/bunyan.sub").enable(config.bunyan.enabled, this._client);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require("./diagnostic-channel/winston.sub").enable(config.winston.enabled, this._client);
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
