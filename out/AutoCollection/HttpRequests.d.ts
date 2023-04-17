import Contracts = require("../Declarations/Contracts");
import TelemetryClient = require("../Library/TelemetryClient");
import HttpRequestParser = require("./HttpRequestParser");
declare class AutoCollectHttpRequests {
    static INSTANCE: AutoCollectHttpRequests;
    private static HANDLER_READY;
    private static alreadyAutoCollectedFlag;
    private _client;
    private _isEnabled;
    private _isInitialized;
    private _isAutoCorrelating;
    constructor(client: TelemetryClient);
    enable(isEnabled: boolean): void;
    useAutoCorrelation(isEnabled: boolean, forceClsHooked?: boolean): void;
    isInitialized(): boolean;
    isAutoCorrelating(): boolean;
    private _generateCorrelationContext;
    private _registerRequest;
    private _initialize;
    /**
     * Tracks a request synchronously (doesn't wait for response 'finish' event)
     */
    static trackRequestSync(client: TelemetryClient, telemetry: Contracts.NodeHttpRequestTelemetry): void;
    /**
     * Tracks a request by listening to the response 'finish' event
     */
    static trackRequest(client: TelemetryClient, telemetry: Contracts.NodeHttpRequestTelemetry, _requestParser?: HttpRequestParser): void;
    /**
     * Add the target correlationId to the response headers, if not already provided.
     */
    private static addResponseCorrelationIdHeader;
    private static endRequest;
    dispose(): void;
}
export = AutoCollectHttpRequests;
