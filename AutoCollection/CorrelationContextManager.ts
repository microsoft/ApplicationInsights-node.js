import http = require("http");

export interface CorrelationContext {
    operationId: string;
}

export class CorrelationContextManager {
    private static contexts: {[uid: number]: CorrelationContext} = [];
    private static currentContext: CorrelationContext = null;
    private static enabled: boolean = false;
    private static hasEverEnabled: boolean = false;

    /** 
     *  Provides the current Context.
     *  The context is the most recent one entered into for the current
     *  logical chain of execution, including across asynchronous calls.
     */
    public static getCurrentContext(): CorrelationContext {
        if (!this.enabled) {
            return null;
        }
        return this.currentContext;
    }

    /** 
     *  Enters a new Context.
     *  All logical children of the execution path that entered this Context
     *  will receive this Context object on calls to GetCurrentContext.
     */
    public static enterNewContext(context: CorrelationContext) {
        this.currentContext = context;
    }

    /**
     *  Enables the CorrelationContextManager. This uses Node's async_wrap
     *  API which is not available in older versions of Node (< 0.12.1).
     *  This method will detect these old versions and do nothing.
     */
    public static enable() {
        if (/^0\.([0-9]\.)|(10\.)|(11\.)|(12\.0$)/.test(process.versions.node)) {
            return;
        }

        this.enabled = true;
        
        if (!this.hasEverEnabled) {
            this.hasEverEnabled = true;

            // Suppress unstable warning from async-hook
            process.env["NODE_ASYNC_HOOK_NO_WARNING"] = true;

            // Load in async-hook and enable it
            var asyncHook = require("async-hook");
            asyncHook.addHooks({
                init: this.onAsyncInit,
                pre: this.onAsyncPre,
                post: this.onAsyncPost,
                destroy: this.onAsyncDestroy});
            asyncHook.enable();
        }
    }

    public static disable() {
        this.enabled = false;
    }

    public static isEnabled() {
        return this.enabled;
    }


    // Callbacks for async-hook
    private static onAsyncInit(uid: number) {
        this.contexts[uid] = this.currentContext;
    }

    private static onAsyncPre(uid: number) {
        this.currentContext = this.contexts[uid];
    }

    private static onAsyncPost(uid: number) {
        this.currentContext = null;
    }

    private static onAsyncDestroy(uid: number) {
        delete this.contexts[uid];
    }
}