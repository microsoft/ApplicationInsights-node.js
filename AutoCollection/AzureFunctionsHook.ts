import { Disposable, PostInvocationContext, PreInvocationContext } from "@azure/functions-core";
import Logging = require("../Library/Logging");
import TelemetryClient = require("../Library/TelemetryClient");
import { CorrelationContext, CorrelationContextManager } from "./CorrelationContextManager";
import * as sharedFuncTypes from "../Library/Functions";
import * as v3 from "@azure/functions";

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
    private _cachedModelHelper: FuncModelV3Helper | FuncModelV4Helper | null | undefined;

    constructor(client: TelemetryClient) {
        this._client = client;
        this._autoGenerateIncomingRequests = false;
        try {
            this._functionsCoreModule = require("@azure/functions-core");
            this._addPreInvocationHook();
            this._addPostInvocationHook();
        }
        catch (error) {
            Logging.info("AzureFunctionsHook failed to load, not running in Azure Functions");
        }
    }

    /**
     * NOTE: The programming model can be changed any time until the first invocation
     * For that reason, we delay setting the model helper until the first hook is called, but we can cache it after that
     */
    private _getFuncModelHelper(): FuncModelV3Helper | FuncModelV4Helper | null {
        if (this._cachedModelHelper === undefined) {
            const funcProgModel = this._functionsCoreModule.getProgrammingModel();
            if (funcProgModel.name === "@azure/functions") {
                if (funcProgModel.version.startsWith("3.")) {
                    this._cachedModelHelper = new FuncModelV3Helper();
                } else if (funcProgModel.version.startsWith("4.")) {
                    this._cachedModelHelper = new FuncModelV4Helper();
                }
            }

            if (!this._cachedModelHelper) {
                this._cachedModelHelper = null;
                Logging.warn(`AzureFunctionsHook does not support model "${funcProgModel.name}" version "${funcProgModel.version}"`);
            }
        }

        return this._cachedModelHelper;
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
                try {
                    const modelHelper = this._getFuncModelHelper();
                    if (modelHelper) {
                        const sharedContext = <sharedFuncTypes.Context>preInvocationContext.invocationContext;
                        // Start an AI Correlation Context using the provided Function context
                        let extractedContext = CorrelationContextManager.startOperation(sharedContext);
                        if (extractedContext) { // Will be null if CorrelationContextManager is not enabled, we should not try to propagate context in that case
                            extractedContext.customProperties.setProperty("InvocationId", sharedContext.invocationId);

                            const traceContext = sharedContext.traceContext;
                            if (traceContext.attributes) {
                                extractedContext.customProperties.setProperty("ProcessId", traceContext.attributes["ProcessId"]);
                                extractedContext.customProperties.setProperty("LogLevel", traceContext.attributes["LogLevel"]);
                                extractedContext.customProperties.setProperty("Category", traceContext.attributes["Category"]);
                                extractedContext.customProperties.setProperty("HostInstanceId", traceContext.attributes["HostInstanceId"]);
                                extractedContext.customProperties.setProperty("AzFuncLiveLogsSessionId", traceContext.attributes["#AzFuncLiveLogsSessionId"]);
                            }
                            preInvocationContext.functionCallback = CorrelationContextManager.wrapCallback(preInvocationContext.functionCallback, extractedContext);
                            if (modelHelper.isHttpTrigger(preInvocationContext) && this._autoGenerateIncomingRequests) {
                                preInvocationContext.hookData.appInsightsExtractedContext = extractedContext;
                                preInvocationContext.hookData.appInsightsStartTime = Date.now(); // Start trackRequest timer
                            }
                        }
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
                    const modelHelper = this._getFuncModelHelper();
                    if (modelHelper) {
                        if (this._autoGenerateIncomingRequests) {
                            if (modelHelper.isHttpTrigger(postInvocationContext)) {
                                const request = <sharedFuncTypes.HttpRequest>postInvocationContext.inputs[0];
                                if (request) {
                                    const startTime: number = postInvocationContext.hookData.appInsightsStartTime || Date.now();
                                    const extractedContext: CorrelationContext | undefined = postInvocationContext.hookData.appInsightsExtractedContext;
                                    if (!extractedContext) {
                                        this._createIncomingRequestTelemetry(request, postInvocationContext, startTime, null);
                                    }
                                    else {
                                        CorrelationContextManager.runWithContext(extractedContext, () => {
                                            this._createIncomingRequestTelemetry(request, postInvocationContext, startTime, extractedContext.operation.parentId);
                                        });
                                    }
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

    private _createIncomingRequestTelemetry(request: sharedFuncTypes.HttpRequest, hookContext: PostInvocationContext, startTime: number, parentId: string) {
        const values = this._getFuncModelHelper().getStatusCodes(hookContext);
        let statusCode: string | number = 200; //Default
        if (values) {
            for (const value of values) {
                if (typeof value === "number" && Number.isInteger(value)) {
                    statusCode = value;
                    break;
                } else if (typeof value === "string") {
                    const parsedVal = parseInt(value);
                    if (!isNaN(parsedVal)) {
                        statusCode = parsedVal;
                        break;
                    }
                }
            }
        } else {
            statusCode = undefined;
        }
        this._client.trackRequest({
            name: request.method + " " + request.url,
            resultCode: statusCode,
            success: typeof (statusCode) === "number" ? (0 < statusCode) && (statusCode < 400) : undefined,
            url: request.url,
            time: new Date(startTime),
            duration: Date.now() - startTime,
            id: parentId
        });
        this._client.flush();
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

class FuncModelV3Helper {
    private _getInvocationContext(hookContext: PreInvocationContext | PostInvocationContext): v3.Context {
        return <v3.Context>hookContext.invocationContext;
    }

    public getStatusCodes(hookContext: PostInvocationContext): unknown[] | undefined {
        const ctx = this._getInvocationContext(hookContext);

        let response: v3.HttpResponse | undefined;
        const httpOutputBinding = ctx.bindingDefinitions.find(b => b.direction === "out" && b.type.toLowerCase() === "http");
        if (httpOutputBinding?.name === "$return") {
            response = hookContext.result;
        } else if (httpOutputBinding && ctx.bindings && ctx.bindings[httpOutputBinding.name] !== undefined) {
            response = ctx.bindings[httpOutputBinding.name];
        } else {
            response = ctx.res;
        }

        return response ? [response.statusCode, response.status] : undefined;
    }

    public isHttpTrigger(hookContext: PreInvocationContext | PostInvocationContext): boolean {
        const ctx = this._getInvocationContext(hookContext);
        return !!ctx.bindingDefinitions.find(b => b.type?.toLowerCase() === "httptrigger");
    }
}

/**
 * V4 is only supported on Node.js v18+
 * Unfortunately that means we can't use the "@azure/functions" types for v4 or we break the build on Node <v18
 */
class FuncModelV4Helper {
    private _getInvocationContext(hookContext: PreInvocationContext | PostInvocationContext): any {
        return hookContext.invocationContext;
    }

    public getStatusCodes(hookContext: PostInvocationContext): unknown[] | undefined {
        let response = hookContext.result;
        return response ? [response.status] : undefined;
    }

    public isHttpTrigger(hookContext: PreInvocationContext | PostInvocationContext) {
        const ctx = this._getInvocationContext(hookContext);
        return ctx.options.trigger.type.toLowerCase() === "httptrigger";
    }
}
