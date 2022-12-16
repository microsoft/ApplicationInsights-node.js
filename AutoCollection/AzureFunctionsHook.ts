import { Context, HttpRequest } from "../Library/Functions";
import Logging = require("../Library/Logging");
import TelemetryClient = require("../Library/TelemetryClient");
import { CorrelationContext, CorrelationContextManager } from "./CorrelationContextManager";


/** Node.js Azure Functions handle incoming HTTP requests before Application Insights SDK is available,
 * this code generate incoming request telemetry and generate correlation context to be used 
 * by outgoing requests and other telemetry, we rely on hooks provided by Azure Functions
*/
export class AzureFunctionsHook {
    private _client: TelemetryClient;
    private _functionsCoreModule: any;
    private _autoGenerateIncomingRequests: boolean;
    private _preInvocationHook: any;

    constructor(client: TelemetryClient) {
        this._client = client;
        this._autoGenerateIncomingRequests = false;
        try {
            this._functionsCoreModule = require('@azure/functions-core');
        }
        catch (error) {
            Logging.info("AzureFunctionsHook failed to load, not running in Azure Functions");
            return;
        }
        this._addPreInvocationHook();
    }

    public enable(isEnabled: boolean) {
        this._autoGenerateIncomingRequests = isEnabled;
    }

    public dispose() {
        this.enable(false);
        this._removePreInvocationHook();
        this._functionsCoreModule = undefined;
    }

    private _addPreInvocationHook() {
        if (!this._preInvocationHook) {
            this._preInvocationHook = this._functionsCoreModule.registerHook('preInvocation', async (preInvocationContext: any) => {
                const originalCallback = preInvocationContext.functionCallback;
                preInvocationContext.functionCallback = async (ctx: Context, request: HttpRequest) => {
                    this._propagateContext(ctx, request, originalCallback);
                };
            });
        }
    }

    private async _propagateContext(ctx: Context, request: HttpRequest, originalCallback: any) {
        // Update context to use Azure Functions one
        let extractedContext: CorrelationContext = null;
        try {
            // Start an AI Correlation Context using the provided Function context
            extractedContext = CorrelationContextManager.startOperation(ctx, request);
            extractedContext.customProperties.setProperty("InvocationId", ctx.invocationId);
            if (ctx.traceContext.attributes) {
                extractedContext.customProperties.setProperty("ProcessId", ctx.traceContext.attributes["ProcessId"]);
                extractedContext.customProperties.setProperty("LogLevel", ctx.traceContext.attributes["LogLevel"]);
                extractedContext.customProperties.setProperty("Category", ctx.traceContext.attributes["Category"]);
                extractedContext.customProperties.setProperty("HostInstanceId", ctx.traceContext.attributes["HostInstanceId"]);
                extractedContext.customProperties.setProperty("AzFuncLiveLogsSessionId", ctx.traceContext.attributes["#AzFuncLiveLogsSessionId"]);
            }
        }
        catch (err) {
            Logging.warn("Failed to propagate context in Azure Functions", err);
            originalCallback(ctx, request);
            return;
        }
        if (!extractedContext) {
            // Correlation Context could be disabled causing this to be null
            Logging.warn("Failed to create context in Azure Functions");
            originalCallback(ctx, request);
            return;
        }

        CorrelationContextManager.wrapCallback(async () => {
            const startTime = Date.now(); // Start trackRequest timer
            originalCallback(ctx, request);
            try {
                if (this._autoGenerateIncomingRequests) {
                    let statusCode = 200; //Default
                    if (ctx.res) {
                        if (ctx.res.statusCode) {
                            statusCode = ctx.res.statusCode;
                        }
                        else if (ctx.res.status) {
                            statusCode = ctx.res.status;
                        }
                    }
                    this._client.trackRequest({
                        name: request.method + " " + request.url,
                        resultCode: statusCode,
                        success: statusCode == 200,
                        url: request.url,
                        time: new Date(startTime),
                        duration: Date.now() - startTime,
                        id: extractedContext.operation?.parentId,
                    });
                    this._client.flush();
                }
            }
            catch (err) {
                Logging.warn("Error creating automatic incoming request in Azure Functions", err);
            }
        }, extractedContext)();
    }

    private _removePreInvocationHook() {
        if (this._preInvocationHook) {
            this._preInvocationHook.dispose();
            this._preInvocationHook = undefined;
        }
    }
}
