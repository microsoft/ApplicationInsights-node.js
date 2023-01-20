import { Disposable, PostInvocationContext, PreInvocationContext } from "@azure/functions-core";
import { Context, HttpRequest } from "@azure/functions";
import Logging = require("../Library/Logging");
import TelemetryClient = require("../Library/TelemetryClient");
import { CorrelationContext, CorrelationContextManager } from "./CorrelationContextManager";

/** Node.js Azure Functions handle incoming HTTP requests before Application Insights SDK is available,
 * this code generate incoming request telemetry and generate correlation context to be used
 * by outgoing requests and other telemetry, we rely on hooks provided by Azure Functions
*/
export class AzureFunctionsHook {
    private _client: TelemetryClient;
    private _functionsCoreModule: typeof import("@azure/functions-core");
    private _autoGenerateIncomingRequests: boolean;
    private _preInvocationHook: Disposable;
    private _postInvocationHook: Disposable;

    constructor(client: TelemetryClient) {
        this._client = client;
        this._autoGenerateIncomingRequests = false;
        try {
            this._functionsCoreModule = require("@azure/functions-core");
        }
        catch (error) {
            Logging.info("AzureFunctionsHook failed to load, not running in Azure Functions");
            return;
        }

        // Only v3 of Azure Functions library is supported right now. See matrix of versions here:
        // https://github.com/Azure/azure-functions-nodejs-library
        const funcProgModel = this._functionsCoreModule.getProgrammingModel();
        if (funcProgModel.name === "@azure/functions" && funcProgModel.version.startsWith("3.")) {
            this._addPreInvocationHook();
            this._addPostInvocationHook();
        } else {
            Logging.warn(`AzureFunctionsHook does not support model "${funcProgModel.name}" version "${funcProgModel.version}"`);
        }
    }

    public enable(isEnabled: boolean) {
        this._autoGenerateIncomingRequests = isEnabled;
    }

    public dispose() {
        this.enable(false);
        this._removeInvocationHooks();
        this._functionsCoreModule = undefined;
    }

    private _addPreInvocationHook() {
        if (!this._preInvocationHook) {
            this._preInvocationHook = this._functionsCoreModule.registerHook("preInvocation", async (preInvocationContext: PreInvocationContext) => {
                const ctx: Context = <Context>preInvocationContext.invocationContext;

                // Update context to use Azure Functions one
                let extractedContext: CorrelationContext = null;
                try {
                    // Start an AI Correlation Context using the provided Function context
                    extractedContext = CorrelationContextManager.startOperation(ctx);
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
                    return;
                }
                if (!extractedContext) {
                    // Correlation Context could be disabled causing this to be null
                    Logging.warn("Failed to create context in Azure Functions");
                    return;
                }

                preInvocationContext.functionCallback = CorrelationContextManager.wrapCallback(preInvocationContext.functionCallback, extractedContext);
                if (this._isHttpTrigger(ctx) && this._autoGenerateIncomingRequests) {
                    preInvocationContext.hookData.appInsightsExtractedContext = extractedContext;
                    preInvocationContext.hookData.appInsightsStartTime = Date.now(); // Start trackRequest timer
                }
            });
        }
    }

    private _addPostInvocationHook() {
        if (!this._postInvocationHook) {
            this._postInvocationHook = this._functionsCoreModule.registerHook("postInvocation", async (postInvocationContext: PostInvocationContext) => {
                try {
                    if (this._autoGenerateIncomingRequests) {
                        const ctx: Context = <Context>postInvocationContext.invocationContext;
                        if (this._isHttpTrigger(ctx)) {
                            const request: HttpRequest = postInvocationContext.inputs[0];
                            if (request) {
                                const startTime: number = postInvocationContext.hookData.appInsightsStartTime || Date.now();
                                const extractedContext: CorrelationContext | undefined = postInvocationContext.hookData.appInsightsExtractedContext;
                                if (!extractedContext) {
                                    this._createIncomingRequestTelemetry(ctx, request, startTime, null);
                                }
                                CorrelationContextManager.runWithContext(extractedContext, () => {
                                    this._createIncomingRequestTelemetry(ctx, request, startTime, extractedContext.operation.parentId);
                                });
                            }
                        }
                    }
                }
                catch (err) {
                    Logging.warn("Error creating automatic incoming request in Azure Functions", err);
                }
            });
        }
    }

    private _createIncomingRequestTelemetry(ctx: Context, request: HttpRequest, startTime: number, parentId: string) {
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
            id: parentId
        });
        this._client.flush();
    }

    private _isHttpTrigger(ctx: Context) {
        return ctx.bindingDefinitions.find(b => b.type?.toLowerCase() === "httptrigger");
    }

    private _removeInvocationHooks() {
        if (this._preInvocationHook) {
            this._preInvocationHook.dispose();
            this._preInvocationHook = undefined;
        }
        if (this._postInvocationHook) {
            this._postInvocationHook.dispose();
            this._postInvocationHook = undefined;
        }
    }
}
