import "zone.js";
import http = require("http");

export interface CorrelationContext {
    operationId: string;
}

export class CorrelationContextManager {
    private static enabled: boolean = false;
    private static hasEverEnabled: boolean = false;

    /** 
     *  Provides the current Context.
     *  The context is the most recent one entered into for the current
     *  logical chain of execution, including across asynchronous calls.
     */
    public static getCurrentContext(): CorrelationContext {
        if (!CorrelationContextManager.enabled) {
            return null;
        }
        return Zone.current.get("context");
    }

    /** 
     *  Runs a function inside a given Context.
     *  All logical children of the execution path that entered this Context
     *  will receive this Context object on calls to GetCurrentContext.
     */
    public static runWithContext(context: CorrelationContext, fn: ()=>any) {
        if (CorrelationContextManager.enabled) {
            var newZone = Zone.current.fork({name: context.operationId, properties: {context: context}});
            newZone.run(fn);
        } else {
            fn();
        }
    }

    /**
     *  Enables the CorrelationContextManager.
     */
    public static enable() {
        // Run patches first
        if (!this.hasEverEnabled) {
            this.hasEverEnabled = true;
            this.patchRedis();
        }

        this.enabled = true;
    }

    /**
     *  Disables the CorrelationContextManager.
     */
    public static disable() {
        this.enabled = false;
    }

    // Patch methods that manually go async that Zone doesn't catch
    private static requireForPatch(module: string) {
        var req = null;
        try {
            req = require(module);
        } catch (e) {
            return null;
        }
        return req;
    }
    private static patchRedis() {
        var redis = this.requireForPatch("redis");

        if (!redis || !redis.RedisClient) {
            return;
        }

        var orig = redis.RedisClient.prototype.send_command;
        redis.RedisClient.prototype.send_command = function() {
            var args = Array.prototype.slice.call(arguments);
            var lastArg = args[args.length - 1];

            if (typeof lastArg === "function") {
                args[args.length - 1] = Zone.current.wrap(lastArg, "ApplicationInsights.CorrelationContextManager.patchRedis");
            } else if (Array.isArray(lastArg) && typeof lastArg[lastArg.length - 1] === "function") {
                // The last argument can be an array!
                var lastIndexLastArg = lastArg[lastArg.length - 1];
                lastArg[lastArg.length - 1] = Zone.current.wrap(lastIndexLastArg, "ApplicationInsights.CorrelationContextManager.patchRedis");
            }

            return orig.apply(this, args);
        };
    }

}