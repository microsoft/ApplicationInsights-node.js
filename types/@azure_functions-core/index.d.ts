// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

// Copied from https://github.com/Azure/azure-functions-nodejs-worker/blob/v3.x/types-core/index.d.ts

/**
 * This module is shipped as a built-in part of the Azure Functions Node.js worker and is available at runtime
 */
declare module '@azure/functions-core' {
    /**
     * The version of the Node.js worker
     */
    const version: string;

    /**
     * The version of the Functions Host
     */
    const hostVersion: string;

    /**
     * Register a function
     * This is a preview feature and requires the feature flag `EnableWorkerIndexing` to be set in the app setting `AzureWebJobsFeatureFlags`
     */
    function registerFunction(metadata: FunctionMetadata, callback: FunctionCallback): Disposable;

    /**
     * A slimmed down version of `RpcFunctionMetadata` that includes the minimum amount of information needed to register a function
     * NOTE: All properties on this object need to be deterministic to support the multiple worker scenario. More info here: https://github.com/Azure/azure-functions-nodejs-worker/issues/638
     */
    interface FunctionMetadata {
        /**
         * The function name, used for display and tracking purposes
         * Must be unique within the app
         */
        name: string;

        /**
         * The function id, used for tracking purposes
         * Must be unique within the app
         * If not specified, the function name will be used
         */
        functionId?: string;

        /**
         * A dictionary of binding name to binding info
         */
        bindings: { [name: string]: RpcBindingInfo };
    }

    /**
     * Register a hook to interact with the lifecycle of Azure Functions.
     * Hooks are executed in the order they were registered and will block execution if they throw an error
     */
    function registerHook(hookName: 'preInvocation', callback: PreInvocationCallback): Disposable;
    function registerHook(hookName: 'postInvocation', callback: PostInvocationCallback): Disposable;
    function registerHook(hookName: 'appStart', callback: AppStartCallback): Disposable;
    function registerHook(hookName: 'appTerminate', callback: AppTerminateCallback): Disposable;
    function registerHook(hookName: string, callback: HookCallback): Disposable;

    type HookCallback = (context: HookContext) => void | Promise<void>;
    type PreInvocationCallback = (context: PreInvocationContext) => void | Promise<void>;
    type PostInvocationCallback = (context: PostInvocationContext) => void | Promise<void>;
    type AppStartCallback = (context: AppStartContext) => void | Promise<void>;
    type AppTerminateCallback = (context: AppTerminateContext) => void | Promise<void>;

    type HookData = { [key: string]: any };

    /**
     * Base interface for all hook context objects
     */
    interface HookContext {
        /**
         * The recommended place to share data between hooks in the same scope (app-level vs invocation-level)
         * This object is readonly. You may modify it, but attempting to overwrite it will throw an error
         */
        readonly hookData: HookData;
        /**
         * The recommended place to share data across scopes for all hooks
         * This object is readonly. You may modify it, but attempting to overwrite it will throw an error
         */
        readonly appHookData: HookData;
    }

    /**
     * Context on a function that is about to be executed
     * This object will be passed to all pre invocation hooks
     */
    interface PreInvocationContext extends HookContext {
        /**
         * The context object passed to the function
         * This object is readonly. You may modify it, but attempting to overwrite it will throw an error
         */
        readonly invocationContext: unknown;

        /**
         * The input values for this specific invocation. Changes to this array _will_ affect the inputs passed to your function
         */
        inputs: any[];

        /**
         * The function callback for this specific invocation. Changes to this value _will_ affect the function itself
         */
        functionCallback: FunctionCallback;
    }

    /**
     * Context on a function that has just executed
     * This object will be passed to all post invocation hooks
     */
    interface PostInvocationContext extends HookContext {
        /**
         * The context object passed to the function
         * This object is readonly. You may modify it, but attempting to overwrite it will throw an error
         */
        readonly invocationContext: unknown;

        /**
         * The input values for this specific invocation
         */
        inputs: any[];

        /**
         * The result of the function, or null if there is no result. Changes to this value _will_ affect the overall result of the function
         */
        result: any;

        /**
         * The error for the function, or null if there is no error. Changes to this value _will_ affect the overall result of the function
         */
        error: any;
    }

    /**
     * Context on a function app that is about to be started
     * This object will be passed to all app start hooks
     */
    interface AppStartContext extends HookContext {
        /**
         * Absolute directory of the function app
         */
        functionAppDirectory: string;
    }

    type AppTerminateContext = HookContext;

    /**
     * Represents a type which can release resources, such as event listening or a timer.
     */
    class Disposable {
        /**
         * Combine many disposable-likes into one. You can use this method when having objects with a dispose function which aren't instances of `Disposable`.
         *
         * @param disposableLikes Objects that have at least a `dispose`-function member. Note that asynchronous dispose-functions aren't awaited.
         * @return Returns a new disposable which, upon dispose, will dispose all provided disposables.
         */
        static from(...disposableLikes: { dispose: () => any }[]): Disposable;

        /**
         * Creates a new disposable that calls the provided function on dispose.
         * *Note* that an asynchronous function is not awaited.
         *
         * @param callOnDispose Function that disposes something.
         */
        constructor(callOnDispose: () => any);

        /**
         * Dispose this object.
         */
        dispose(): any;
    }

    /**
     * Registers the main programming model to be used for a Node.js function app
     * Only one programming model can be set. The last programming model registered will be used
     * If not explicitly set, a default programming model included with the worker will be used
     */
    function setProgrammingModel(programmingModel: ProgrammingModel): void;

    /**
     * Returns the currently registered programming model
     * If not explicitly set, a default programming model included with the worker will be used
     */
    function getProgrammingModel(): ProgrammingModel;

    /**
     * A set of information and methods that describe the model for handling a Node.js function app
     * Currently, this is mainly focused on invocation
     */
    interface ProgrammingModel {
        /**
         * A name for this programming model, generally only used for tracking purposes
         */
        name: string;

        /**
         * A version for this programming model, generally only used for tracking purposes
         */
        version: string;

        /**
         * Returns a new instance of the invocation model for each invocation
         */
        getInvocationModel(coreContext: CoreInvocationContext): InvocationModel;
    }

    /**
     * Basic information and helper methods about an invocation provided from the core worker to the programming model
     */
    interface CoreInvocationContext {
        /**
         * A guid unique to this invocation
         */
        invocationId: string;

        /**
         * The invocation request received by the worker from the host
         */
        request: RpcInvocationRequest;

        /**
         * Metadata about the function
         */
        metadata: RpcFunctionMetadata;

        /**
         * Describes the current state of invocation, or undefined if between states
         */
        state?: InvocationState;

        /**
         * The recommended way to log information
         */
        log(level: RpcLogLevel, category: RpcLogCategory, message: string): void;
    }

    type InvocationState = 'preInvocationHooks' | 'postInvocationHooks' | 'invocation';

    /**
     * A set of methods that describe the model for invoking a function
     */
    interface InvocationModel {
        /**
         * Returns the context object and inputs to be passed to all following invocation methods
         * This is run before preInvocation hooks
         */
        getArguments(): Promise<InvocationArguments>;

        /**
         * The main method that executes the user's function callback
         * This is run between preInvocation and postInvocation hooks
         * @param context The context object returned in `getArguments`, potentially modified by preInvocation hooks
         * @param inputs The input array returned in `getArguments`, potentially modified by preInvocation hooks
         * @param callback The function callback to be executed
         */
        invokeFunction(context: unknown, inputs: unknown[], callback: FunctionCallback): Promise<unknown>;

        /**
         * Returns the invocation response to send back to the host
         * This is run after postInvocation hooks
         * @param context The context object created in `getArguments`
         * @param result The result of the function callback, potentially modified by postInvocation hooks
         */
        getResponse(context: unknown, result: unknown): Promise<RpcInvocationResponse>;
    }

    interface InvocationArguments {
        /**
         * This is usually the first argument passed to a function callback
         */
        context: unknown;

        /**
         * The remaining arguments passed to a function callback, generally describing the trigger/input bindings
         */
        inputs: unknown[];
    }

    type FunctionCallback = (context: unknown, ...inputs: unknown[]) => unknown;

    // #region rpc types
    interface RpcFunctionMetadata {
        name?: string | null;

        directory?: string | null;

        scriptFile?: string | null;

        entryPoint?: string | null;

        bindings?: { [k: string]: RpcBindingInfo } | null;

        isProxy?: boolean | null;

        status?: RpcStatusResult | null;

        language?: string | null;

        rawBindings?: string[] | null;

        functionId?: string | null;

        managedDependencyEnabled?: boolean | null;
    }

    interface RpcStatusResult {
        status?: RpcStatus | null;

        result?: string | null;

        exception?: RpcException | null;

        logs?: RpcLog[] | null;
    }

    type RpcStatus = 'failure' | 'success' | 'cancelled';

    interface RpcLog {
        invocationId?: string | null;

        category?: string | null;

        level?: RpcLogLevel | null;

        message?: string | null;

        eventId?: string | null;

        exception?: RpcException | null;

        logCategory?: RpcLogCategory | null;
    }

    type RpcLogLevel = 'trace' | 'debug' | 'information' | 'warning' | 'error' | 'critical' | 'none';

    type RpcLogCategory = 'user' | 'system' | 'customMetric';

    interface RpcException {
        source?: string | null;

        stackTrace?: string | null;

        message?: string | null;
    }

    interface RpcBindingInfo {
        type?: string | null;

        direction?: RpcBindingDirection | null;

        dataType?: RpcBindingDataType | null;
    }

    type RpcBindingDirection = 'in' | 'out' | 'inout';

    type RpcBindingDataType = 'undefined' | 'string' | 'binary' | 'stream';

    interface RpcTypedData {
        string?: string | null;

        json?: string | null;

        bytes?: Uint8Array | null;

        stream?: Uint8Array | null;

        http?: RpcHttpData | null;

        int?: number | Long | null;

        double?: number | null;

        collectionBytes?: RpcCollectionBytes | null;

        collectionString?: RpcCollectionString | null;

        collectionDouble?: RpcCollectionDouble | null;

        collectionSint64?: RpcCollectionSInt64 | null;
    }

    interface RpcCollectionSInt64 {
        sint64?: (number | Long)[] | null;
    }

    interface RpcCollectionString {
        string?: string[] | null;
    }

    interface RpcCollectionBytes {
        bytes?: Uint8Array[] | null;
    }

    interface RpcCollectionDouble {
        double?: number[] | null;
    }

    interface RpcInvocationRequest {
        invocationId?: string | null;

        functionId?: string | null;

        inputData?: RpcParameterBinding[] | null;

        triggerMetadata?: { [k: string]: RpcTypedData } | null;

        traceContext?: RpcTraceContext | null;

        retryContext?: RpcRetryContext | null;
    }

    interface RpcTraceContext {
        traceParent?: string | null;

        traceState?: string | null;

        attributes?: { [k: string]: string } | null;
    }

    interface RpcRetryContext {
        retryCount?: number | null;

        maxRetryCount?: number | null;

        exception?: RpcException | null;
    }

    interface RpcInvocationResponse {
        invocationId?: string | null;

        outputData?: RpcParameterBinding[] | null;

        returnValue?: RpcTypedData | null;

        result?: RpcStatusResult | null;
    }

    interface RpcParameterBinding {
        name?: string | null;

        data?: RpcTypedData | null;
    }

    interface RpcHttpData {
        method?: string | null;

        url?: string | null;

        headers?: { [k: string]: string } | null;

        body?: RpcTypedData | null;

        params?: { [k: string]: string } | null;

        statusCode?: string | null;

        query?: { [k: string]: string } | null;

        enableContentNegotiation?: boolean | null;

        rawBody?: RpcTypedData | null;

        cookies?: RpcHttpCookie[] | null;

        nullableHeaders?: { [k: string]: RpcNullableString } | null;

        nullableParams?: { [k: string]: RpcNullableString } | null;

        nullableQuery?: { [k: string]: RpcNullableString } | null;
    }

    interface RpcHttpCookie {
        name?: string | null;

        value?: string | null;

        domain?: RpcNullableString | null;

        path?: RpcNullableString | null;

        expires?: RpcNullableTimestamp | null;

        secure?: RpcNullableBool | null;

        httpOnly?: RpcNullableBool | null;

        sameSite?: RpcHttpCookieSameSite | null;

        maxAge?: RpcNullableDouble | null;
    }

    interface RpcNullableString {
        value?: string | null;
    }

    interface RpcNullableDouble {
        value?: number | null;
    }

    interface RpcNullableBool {
        value?: boolean | null;
    }

    interface RpcNullableTimestamp {
        value?: RpcTimestamp | null;
    }

    interface RpcTimestamp {
        seconds?: number | Long | null;

        nanos?: number | null;
    }

    type RpcHttpCookieSameSite = 'none' | 'lax' | 'strict' | 'explicitNone';
    // #endregion rpc types
}