import TelemetryClient = require("../Library/TelemetryClient");
import Config = require("../Library/Config");
declare class HeartBeat {
    static INSTANCE: HeartBeat;
    private _collectionInterval;
    private _client;
    private _handle;
    private _isEnabled;
    private _isInitialized;
    private _uniqueProcessId;
    constructor(client: TelemetryClient);
    enable(isEnabled: boolean): void;
    isInitialized(): boolean;
    static isEnabled(): boolean;
    trackHeartBeat(config: Config, callback: () => void): void;
    dispose(): void;
}
export = HeartBeat;
