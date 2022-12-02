import { Context, HttpRequest } from "@azure/functions";
import { PreInvocationContext } from "@azure/functions-core";

import Logging = require("../Library/Logging");
import TelemetryClient = require("../Library/TelemetryClient");
import { CorrelationContextManager } from "./CorrelationContextManager";


/** Node.js Azure Functions handle incoming HTTP requests before Application Insights SDK is available,
 * this code generate incoming request telemetry and generate correlation context to be used 
 * by outgoing requests and other telemetry, we rely on hooks provided by Azure Functions
*/
export class AutoCollectAzureFunctions {
    private _client: TelemetryClient;
    private _isEnabled: boolean;
    private _isInitialized: boolean;
    private _appInsightsHooks: any;
    private _preInvocationHook: any;

    constructor(client: TelemetryClient) {
        this._client = client;
        try {
            this._appInsightsHooks = require('app-insights-functions-hooks');
            this._isInitialized = true;
        }
        catch (error) {
            Logging.info("AutoCollectAzureFunctions failed to load, not running in Azure Functions");
        }
    }

    public enable(isEnabled: boolean) {
        this._isEnabled = isEnabled;
        if (this._isInitialized) {
            if (isEnabled) {
                this._addPreInvocationHook();
            } else {
                this._removePreInvocationHook();
            }
        }
    }

    public dispose() {
        this.enable(false);
        this._isInitialized = false;
    }

    private _addPreInvocationHook() {
        // Only add hook once
        if (!this._preInvocationHook) {
            this._preInvocationHook = this._appInsightsHooks.registerHook('preInvocation', (context: PreInvocationContext) => {
                const originalCallback = context.functionCallback;
                context.functionCallback = async (context: Context, req: HttpRequest) => {
                    const startTime = Date.now(); // Start trackRequest timer
                    // Start an AI Correlation Context using the provided Function context
                    const correlationContext = CorrelationContextManager.startOperation(context, req);
                    if (correlationContext) {
                        CorrelationContextManager.wrapCallback(async () => {
                            originalCallback(context, req);
                            if (this._client.config.enableAutoCollectRequests) {
                                this._client.trackRequest({
                                    name: context?.req?.method + " " + context.req?.url,
                                    resultCode: context?.res?.status,
                                    success: true,
                                    url: (req as HttpRequest).url,
                                    time: new Date(startTime),
                                    duration: Date.now() - startTime,
                                    id: correlationContext.operation.parentId,
                                });
                                this._client.flush();
                            }
                        }, correlationContext)();
                    }
                };
            });
        }
    }

    private _removePreInvocationHook() {
        if (this._preInvocationHook) {
            this._preInvocationHook.dispose();
            this._preInvocationHook = undefined;
        }
    }
}
