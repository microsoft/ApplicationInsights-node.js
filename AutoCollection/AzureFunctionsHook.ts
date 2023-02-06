import { Disposable, PostInvocationContext, PreInvocationContext } from "@azure/functions-core";
import { Context, HttpRequest, HttpResponse } from "@azure/functions";
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
        catch (error) {
            Logging.info("AzureFunctionsHook failed to load, not running in Azure Functions");
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
                try {
                    // Start an AI Correlation Context using the provided Function context
                    let extractedContext = CorrelationContextManager.startOperation(ctx);
                    extractedContext.customProperties.setProperty("InvocationId", ctx.invocationId);
                    if (ctx.traceContext.attributes) {
                        extractedContext.customProperties.setProperty("ProcessId", ctx.traceContext.attributes["ProcessId"]);
                        extractedContext.customProperties.setProperty("LogLevel", ctx.traceContext.attributes["LogLevel"]);
                        extractedContext.customProperties.setProperty("Category", ctx.traceContext.attributes["Category"]);
                        extractedContext.customProperties.setProperty("HostInstanceId", ctx.traceContext.attributes["HostInstanceId"]);
                        extractedContext.customProperties.setProperty("AzFuncLiveLogsSessionId", ctx.traceContext.attributes["#AzFuncLiveLogsSessionId"]);
                    }
                    preInvocationContext.functionCallback = CorrelationContextManager.wrapCallback(preInvocationContext.functionCallback, extractedContext);
                    if (this._isHttpTrigger(ctx) && this._autoGenerateIncomingRequests) {
                        preInvocationContext.hookData.appInsightsExtractedContext = extractedContext;
                        preInvocationContext.hookData.appInsightsStartTime = Date.now(); // Start trackRequest timer
                    }
                }
                catch (err) {
                    Logging.warn("Failed to propagate context in Azure Functions", err);
                    return;
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
                                const response = this._getAzureFunctionResponse(postInvocationContext, ctx);
                                const extractedContext: CorrelationContext | undefined = postInvocationContext.hookData.appInsightsExtractedContext;
                                if (!extractedContext) {
                                    this._createIncomingRequestTelemetry(request, response, startTime, null);
                                }
                                else {
                                    CorrelationContextManager.runWithContext(extractedContext, () => {
                                        this._createIncomingRequestTelemetry(request, response, startTime, extractedContext.operation.parentId);
                                    });
                                }
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

    private _createIncomingRequestTelemetry(request: HttpRequest, response: HttpResponse, startTime: number, parentId: string) {
        let statusCode: string | number = 200; //Default
        if (response?.statusCode) {
            statusCode = response.statusCode;
        }
        this._client.trackRequest({
            name: request.method + " " + request.url,
            resultCode: statusCode,
            success: (0 < statusCode) && (statusCode < 400),
            url: request.url,
            time: new Date(startTime),
            duration: Date.now() - startTime,
            id: parentId
        });
        this._client.flush();
    }

    private _getAzureFunctionResponse(postInvocationContext: PostInvocationContext, ctx: Context): HttpResponse {
        const httpOutputBinding = ctx.bindingDefinitions.find(b => b.direction === "out" && b.type.toLowerCase() === "http");
        if (httpOutputBinding.name === "$return") {
            return postInvocationContext.result;
        } else if (ctx.bindings[httpOutputBinding.name] !== undefined) {
            return ctx.bindings[httpOutputBinding.name];
        } else {
            return ctx.res;
        }
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
