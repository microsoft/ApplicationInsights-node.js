/// <reference path="..\node_modules\zone.js\dist\zone.js.d.ts" />
var nodeVer = process.versions.node.split(".");
if (parseInt(nodeVer[0]) > 3 || (parseInt(nodeVer[0]) > 2 && parseInt(nodeVer[1]) > 2)) { // Unit tests warn of errors < 3.3 from timer patching. All versions before 4 were 0.x
    require("zone.js"); // Keep this first
}
import http = require("http");

export interface CorrelationContext {
    operationId: string;
    userProperties?: {};
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
            var newZone = Zone.current.fork({name: "AI-"+((context && context.operationId) || "Unknown"), properties: {context: context}});
            newZone.run(fn);
        } else {
            fn();
        }
    }

    /** 
     *  Patches a callback to restore the correct Context when getCurrentContext 
     *  is run within it. This is necessary if automatic correlation fails to work
     *  with user-included libraries.
     * 
     *  The supplied callback will be given the same context that was present for 
     *  the call to wrapCallback.  */
    public static wrapCallback<T extends Function>(fn: T): T {
        if (CorrelationContextManager.enabled) {
            return Zone.current.wrap(fn, "User-wrapped method");
        }
        return fn;
    }

    /**
     *  Enables the CorrelationContextManager.
     */
    public static enable() {
        if (!this.isNodeVersionCompatible()) {
            this.enabled = false;
            return;
        }

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


    /**
     *  Reports if the CorrelationContextManager is able to run in this environment
     */
    public static isNodeVersionCompatible() {
        return typeof Zone !== 'undefined'
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

        if (redis && redis.RedisClient) {
            var orig = redis.RedisClient.prototype.send_command;
            redis.RedisClient.prototype.send_command = function() {
                var args = Array.prototype.slice.call(arguments);
                var lastArg = args[args.length - 1];

                if (typeof lastArg === "function") {
                    args[args.length - 1] = Zone.current.wrap(lastArg, "AI.CCM.patchRedis");
                } else if (Array.isArray(lastArg) && typeof lastArg[lastArg.length - 1] === "function") {
                    // The last argument can be an array!
                    var lastIndexLastArg = lastArg[lastArg.length - 1];
                    lastArg[lastArg.length - 1] = Zone.current.wrap(lastIndexLastArg, "AI.CCM.patchRedis");
                }

                return orig.apply(this, args);
            };
        }
    }

}