import TelemetryClient = require("../Library/TelemetryClient");
/** Node.js Azure Functions handle incoming HTTP requests before Application Insights SDK is available,
 * this code generate incoming request telemetry and generate correlation context to be used
 * by outgoing requests and other telemetry, we rely on hooks provided by Azure Functions
*/
export declare class AzureFunctionsHook {
    private _client;
    private _functionsCoreModule;
    private _autoGenerateIncomingRequests;
    private _preInvocationHook;
    private _postInvocationHook;
    constructor(client: TelemetryClient);
    enable(isEnabled: boolean): void;
    dispose(): void;
    private _addPreInvocationHook;
    private _addPostInvocationHook;
    private _createIncomingRequestTelemetry;
    private _getAzureFunctionResponse;
    private _isHttpTrigger;
    private _removeInvocationHooks;
}
